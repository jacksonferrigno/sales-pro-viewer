#!/usr/bin/env python3
"""

Reads data/transcripts.csv and writes data/phrase-lift-profile.json. No LLM.

This is a sparse text classifier: TF-IDF n-grams -> L1 logistic regression ->
probability of demo_booked. The useful output is not a word-count leaderboard;
it is (1) whether transcript language predicts outcome, (2) which phrases carry
positive/negative model weight, and (3) which phrases moved each call score.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.exceptions import UndefinedMetricWarning
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
import warnings

ROOT = Path(__file__).resolve().parent.parent
TRANSCRIPTS_CSV = ROOT / "data" / "transcripts.csv"
OUTPUT_JSON = ROOT / "data" / "phrase-lift-profile.json"

CONFIG: dict[str, Any] = {
    "ngram_range": (1, 5),
    "min_df": 4,
    "max_features": 8000,
    "regularization": "l2",
    "C": 10.0,
    "cv_folds": 5,
    "top_feature_count": 30,
    "cluster_feature_count": 80,
    "min_cluster_size": 2,
    "min_cluster_calls": 12,
    "min_cluster_abs_delta": 0.15,
    "cluster_similarity_threshold": 0.36,
    "per_call_evidence_count": 5,
    "stage_feature_count": 15,
    "prediction_sample_count": 10,
}

FILLER_CLUSTER_RE = re.compile(
    r"^(like|okay|yeah|just|that's|that is|know|mean|things|sir|um|uh|sorry|"
    r"hi|hey|oh|right|good|great|sure|going|want|got|said|think|really|well|"
    r"pretty|little|bit|kind|sort|thing|fine|cool|wow)\b",
    flags=re.IGNORECASE,
)

NAME_STOP_WORDS = [
    "prospect",
    "rep",
]


def fit_quietly(pipe: Pipeline, texts: pd.Series, y: np.ndarray) -> None:
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=FutureWarning)
        warnings.filterwarnings("ignore", message="Inconsistent values*")
        pipe.fit(texts, y)


def is_booked(outcome: str) -> bool:
    return "demo" in outcome.lower()


def utterance_lines(transcript: str) -> list[str]:
    lines: list[str] = []
    for line in transcript.split("\n"):
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^[^:]+:\s*(.*)$", line)
        if m:
            lines.append(m.group(1))
    return lines


def split_stage_text(transcript: str) -> tuple[str, str, str]:
    lines = utterance_lines(transcript)
    if not lines:
        return "", "", ""
    one_third = max(1, len(lines) // 3)
    two_thirds = max(one_third + 1, (2 * len(lines)) // 3)
    return (
        " ".join(lines[:one_third]),
        " ".join(lines[one_third:two_thirds]),
        " ".join(lines[two_thirds:]),
    )


def load_transcripts() -> pd.DataFrame:
    df = pd.read_csv(TRANSCRIPTS_CSV)
    df["booked"] = df["call_outcome"].map(is_booked).astype(int)
    df["text"] = df["transcript"].map(lambda t: " ".join(utterance_lines(t)))
    stages = df["transcript"].map(split_stage_text)
    df["opening_text"] = stages.map(lambda s: s[0])
    df["middle_text"] = stages.map(lambda s: s[1])
    df["closing_text"] = stages.map(lambda s: s[2])
    return df


def make_pipeline() -> Pipeline:
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=CONFIG["ngram_range"],
                    stop_words=list(ENGLISH_STOP_WORDS.union(NAME_STOP_WORDS)),
                    min_df=CONFIG["min_df"],
                    max_features=CONFIG["max_features"],
                    token_pattern=r"(?u)\b[a-z][a-z0-9']+\b",
                    sublinear_tf=True,
                    lowercase=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    penalty=CONFIG["regularization"],
                    C=CONFIG["C"],
                    solver="liblinear",
                    class_weight="balanced",
                    max_iter=2000,
                    random_state=7,
                ),
            ),
        ]
    )


def model_performance(pipe: Pipeline, texts: pd.Series, y: np.ndarray) -> dict:
    cv = StratifiedKFold(n_splits=CONFIG["cv_folds"], shuffle=True, random_state=7)
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UndefinedMetricWarning)
        warnings.filterwarnings("ignore", category=FutureWarning)
        warnings.filterwarnings("ignore", message="Inconsistent values*")
        probs = cross_val_predict(pipe, texts, y, cv=cv, method="predict_proba")[:, 1]

    preds = (probs >= 0.5).astype(int)
    return {
        "crossValidation": {
            "folds": CONFIG["cv_folds"],
            "rocAuc": float(roc_auc_score(y, probs)),
            "averagePrecision": float(average_precision_score(y, probs)),
            "accuracyAtThreshold50": float(accuracy_score(y, preds)),
        }
    }


def feature_weights(pipe: Pipeline) -> tuple[list[str], np.ndarray]:
    vectorizer: TfidfVectorizer = pipe.named_steps["tfidf"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    return list(vectorizer.get_feature_names_out()), clf.coef_[0]


def top_features(features: list[str], weights: np.ndarray, direction: str) -> list[dict]:
    if direction == "positive":
        idxs = np.argsort(weights)[::-1]
        keep = [i for i in idxs if weights[i] > 0]
    else:
        idxs = np.argsort(weights)
        keep = [i for i in idxs if weights[i] < 0]

    rows = []
    for i in keep:
        phrase = features[i]
        if FILLER_CLUSTER_RE.search(phrase):
            continue
        rows.append(
            {
                "phrase": phrase,
                "n": len(phrase.split()),
                "weight": float(weights[i]),
            }
        )
        if len(rows) >= CONFIG["top_feature_count"]:
            break
    return rows


def multiword_features(features: list[str], weights: np.ndarray, direction: str) -> list[dict]:
    return [row for row in top_features(features, weights, direction) if row["n"] >= 2]


def is_reportable_phrase(phrase: str, min_words: int = 2) -> bool:
    return len(phrase.split()) >= min_words and not FILLER_CLUSTER_RE.search(phrase)


def predictive_phrase_candidates(features: list[str], weights: np.ndarray) -> list[dict]:
    rows = []
    for phrase, weight in zip(features, weights):
        n = len(phrase.split())
        if n < 2 or weight == 0:
            continue
        if not is_reportable_phrase(phrase):
            continue
        rows.append(
            {
                "phrase": phrase,
                "n": n,
                "weight": float(weight),
                "direction": "positive" if weight > 0 else "negative",
            }
        )
    rows.sort(key=lambda row: abs(row["weight"]), reverse=True)
    return rows[: CONFIG["cluster_feature_count"]]


def phrase_similarity(a: str, b: str) -> float:
    va = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit([a, b])
    matrix = va.transform([a, b])
    return float((matrix[0] @ matrix[1].T).toarray()[0, 0])


def connected_components(phrases: list[str]) -> list[list[str]]:
    neighbors = {phrase: set() for phrase in phrases}
    for i, left in enumerate(phrases):
        for right in phrases[i + 1 :]:
            if phrase_similarity(left, right) >= CONFIG["cluster_similarity_threshold"]:
                neighbors[left].add(right)
                neighbors[right].add(left)

    seen: set[str] = set()
    components = []
    for phrase in phrases:
        if phrase in seen:
            continue
        stack = [phrase]
        comp = []
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            comp.append(current)
            stack.extend(neighbors[current] - seen)
        if len(comp) >= CONFIG["min_cluster_size"]:
            components.append(comp)
    return components


def discovered_language_clusters(
    df: pd.DataFrame, features: list[str], weights: np.ndarray, baseline: float
) -> list[dict]:
    candidates = predictive_phrase_candidates(features, weights)
    by_phrase = {row["phrase"]: row for row in candidates}
    clusters = []
    for direction in ("positive", "negative"):
        direction_phrases = [
            row["phrase"] for row in candidates if row["direction"] == direction
        ]
        for component in connected_components(direction_phrases):
            component = sorted(
                component, key=lambda phrase: abs(by_phrase[phrase]["weight"]), reverse=True
            )
            component = [p for p in component if not FILLER_CLUSTER_RE.search(p)]
            if len(component) < CONFIG["min_cluster_size"]:
                continue
            label = component[0]
            mask = df["text"].str.lower().map(
                lambda text, phrases=component: any(phrase in text for phrase in phrases)
            )
            n_calls = int(mask.sum())
            if n_calls == 0:
                continue
            booked = int(df.loc[mask, "booked"].sum())
            booking_rate = booked / n_calls
            baseline_delta = booking_rate - baseline
            if n_calls < CONFIG["min_cluster_calls"]:
                continue
            if abs(baseline_delta) < CONFIG["min_cluster_abs_delta"]:
                continue
            if direction == "positive" and baseline_delta <= 0:
                continue
            if direction == "negative" and baseline_delta >= 0:
                continue
            clusters.append(
                {
                    "label": label,
                    "direction": direction,
                    "phrases": component,
                    "callsContaining": n_calls,
                    "coverage": n_calls / len(df),
                    "bookingRate": booking_rate,
                    "baselineDelta": baseline_delta,
                    "avgAbsWeight": float(
                        sum(abs(by_phrase[p]["weight"]) for p in component) / len(component)
                    ),
                    "exampleCallIds": df.loc[mask, "call_id"].head(5).tolist(),
                }
            )
    clusters.sort(
        key=lambda row: (abs(row["baselineDelta"]), row["avgAbsWeight"]), reverse=True
    )
    return clusters


def prediction_samples(pipe: Pipeline, df: pd.DataFrame) -> dict:
    vectorizer: TfidfVectorizer = pipe.named_steps["tfidf"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    features = list(vectorizer.get_feature_names_out())
    weights = clf.coef_[0]
    X = vectorizer.transform(df["text"])
    probs = clf.predict_proba(X)[:, 1]
    out = df[["call_id", "call_outcome"]].copy()
    out["predictedBookingProbability"] = probs
    out["actualBooked"] = df["booked"].astype(bool)

    def evidence(row_idx: int, direction: str) -> list[dict]:
        contribution = X[row_idx].multiply(weights).toarray().ravel()
        present = X[row_idx].toarray().ravel() > 0
        if direction == "positive":
            idxs = [
                i
                for i in np.argsort(contribution)[::-1]
                if present[i]
                and contribution[i] > 0
                and is_reportable_phrase(features[i])
            ]
        else:
            idxs = [
                i
                for i in np.argsort(contribution)
                if present[i]
                and contribution[i] < 0
                and is_reportable_phrase(features[i])
            ]
        return [
            {"phrase": features[i], "contribution": float(contribution[i])}
            for i in idxs[: CONFIG["per_call_evidence_count"]]
        ]

    samples = {}
    for name, frame in {
        "mostLikelyBooked": out.sort_values("predictedBookingProbability", ascending=False),
        "mostLikelyNotBooked": out.sort_values("predictedBookingProbability"),
    }.items():
        rows = []
        for idx in frame.head(CONFIG["prediction_sample_count"]).index:
            rows.append(
                {
                    "callId": df.loc[idx, "call_id"],
                    "actualOutcome": df.loc[idx, "call_outcome"],
                    "predictedBookingProbability": float(probs[idx]),
                    "positiveEvidence": evidence(idx, "positive"),
                    "negativeEvidence": evidence(idx, "negative"),
                }
            )
        samples[name] = rows
    return samples


def call_evidence(pipe: Pipeline, df: pd.DataFrame) -> list[dict]:
    vectorizer: TfidfVectorizer = pipe.named_steps["tfidf"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    features = list(vectorizer.get_feature_names_out())
    weights = clf.coef_[0]
    X = vectorizer.transform(df["text"])
    probs = clf.predict_proba(X)[:, 1]

    rows = []
    for row_idx, row in df.reset_index(drop=True).iterrows():
        x = X[row_idx]
        contribution = x.multiply(weights).toarray().ravel()
        present = x.toarray().ravel() > 0
        positive_idxs = [
            i
            for i in np.argsort(contribution)[::-1]
            if present[i]
            and contribution[i] > 0
            and is_reportable_phrase(features[i])
        ][: CONFIG["per_call_evidence_count"]]
        negative_idxs = [
            i
            for i in np.argsort(contribution)
            if present[i]
            and contribution[i] < 0
            and is_reportable_phrase(features[i])
        ][: CONFIG["per_call_evidence_count"]]

        rows.append(
            {
                "callId": row["call_id"],
                "actualOutcome": row["call_outcome"],
                "predictedBookingProbability": float(probs[row_idx]),
                "positiveEvidence": [
                    {
                        "phrase": features[i],
                        "n": len(features[i].split()),
                        "contribution": float(contribution[i]),
                    }
                    for i in positive_idxs
                ],
                "negativeEvidence": [
                    {
                        "phrase": features[i],
                        "n": len(features[i].split()),
                        "contribution": float(contribution[i]),
                    }
                    for i in negative_idxs
                ],
            }
        )
    return rows


def stage_features(df: pd.DataFrame, stage_col: str) -> dict:
    y = df["booked"].values
    pipe = make_pipeline()
    fit_quietly(pipe, df[stage_col], y)
    features, weights = feature_weights(pipe)
    return {
        "positive": multiword_features(features, weights, "positive")[
            : CONFIG["stage_feature_count"]
        ],
        "negative": multiword_features(features, weights, "negative")[
            : CONFIG["stage_feature_count"]
        ],
    }


def main() -> None:
    df = load_transcripts()
    y = df["booked"].values
    baseline = float(df["booked"].mean())
    booked_n = int(df["booked"].sum())
    not_booked_n = len(df) - booked_n

    pipe = make_pipeline()
    performance = model_performance(pipe, df["text"], y)
    fit_quietly(pipe, df["text"], y)
    features, weights = feature_weights(pipe)

    profile = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Non-generative text model: predict demo booking from transcript language and expose language features that move the prediction.",
        "baseline": {
            "totalCalls": len(df),
            "booked": booked_n,
            "notBooked": not_booked_n,
            "bookingRate": baseline,
        },
        "model": {
            "type": "tfidf_logistic_regression",
            "target": "demo_booked",
            "config": CONFIG,
            **performance,
        },
        "languageSignals": {
            "positiveForBooking": multiword_features(features, weights, "positive"),
            "negativeForBooking": multiword_features(features, weights, "negative"),
        },
        "discoveredLanguageClusters": discovered_language_clusters(
            df, features, weights, baseline
        ),
        "stageLanguageSignals": {
            "opening": stage_features(df, "opening_text"),
            "middle": stage_features(df, "middle_text"),
            "closing": stage_features(df, "closing_text"),
        },
        "predictionSamples": prediction_samples(pipe, df),
    }

    OUTPUT_JSON.write_text(json.dumps(profile, indent=2) + "\n")
    print(f"Wrote {OUTPUT_JSON.relative_to(ROOT)}")
    print(
        f"  corpus: {len(df)} calls ({booked_n} booked, {not_booked_n} not, "
        f"baseline {baseline * 100:.1f}%)"
    )
    cv = profile["model"]["crossValidation"]
    print(
        f"  model: auc={cv['rocAuc']:.3f} ap={cv['averagePrecision']:.3f} "
        f"acc@0.5={cv['accuracyAtThreshold50']:.3f}"
    )
    print(
        "  features: "
        f"{len(profile['languageSignals']['positiveForBooking'])} positive, "
        f"{len(profile['languageSignals']['negativeForBooking'])} negative"
    )


if __name__ == "__main__":
    main()
