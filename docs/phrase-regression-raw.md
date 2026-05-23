# Phrase regression, raw version

1. Start with `transcripts.csv`: each call is transcript text plus an outcome, booked demo or not booked.
2. Convert transcript language into TF-IDF phrase features, using 1-5 word chunks and dropping rare phrases under `min_df=4`.
3. Train logistic regression to predict `demo_booked`, so each phrase gets a positive or negative weight.
4. Check the model with 5-fold cross-validation; current run is about 0.80 ROC AUC, so language has real signal.
5. Group strong weighted phrases into clusters, measure each cluster's booking rate vs the baseline, then let the LLM turn those stats into a short sales brief.
