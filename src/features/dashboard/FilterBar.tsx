"use client";

import Link from "next/link";
import { useRef } from "react";

import type { DashboardData, DashboardFilters } from "@/server/dashboard/types";

import styles from "./dashboard.module.css";

export function FilterBar({
  filters,
  options,
}: {
  filters: DashboardFilters;
  options: DashboardData["filterOptions"];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitForm = () => formRef.current?.requestSubmit();

  const hasFilters =
    filters.outcome ||
    filters.rep ||
    filters.cuisine ||
    filters.restaurantType ||
    filters.duration ||
    filters.tag;

  return (
    <form ref={formRef} className={styles.filters} method="get" action="/">
      <Field
        label="Outcome"
        name="outcome"
        value={filters.outcome}
        options={options.outcomes}
        onFilterChange={submitForm}
      />
      <Field
        label="Rep"
        name="rep"
        value={filters.rep}
        options={options.reps}
        onFilterChange={submitForm}
      />
      <Field
        label="Cuisine"
        name="cuisine"
        value={filters.cuisine}
        options={options.cuisines}
        onFilterChange={submitForm}
      />
      <Field
        label="Restaurant"
        name="restaurantType"
        value={filters.restaurantType}
        options={options.restaurantTypes}
        onFilterChange={submitForm}
      />
      <Field
        label="Duration"
        name="duration"
        value={filters.duration}
        options={[
          { value: "short", label: "≤ 2 min" },
          { value: "medium", label: "2–7 min" },
          { value: "long", label: "> 7 min" },
        ]}
        onFilterChange={submitForm}
      />

      {filters.tag ? (
        <span
          className={`${styles.filterChip} ${
            filters.polarity === "good"
              ? styles.good
              : filters.polarity === "bad"
                ? styles.bad
                : ""
          }`}
        >
          {filters.polarity
            ? `${filters.polarity}: ${filters.tag}`
            : `Signal: ${filters.tag}`}
          <input type="hidden" name="tag" value={filters.tag} />
          {filters.polarity ? (
            <input type="hidden" name="polarity" value={filters.polarity} />
          ) : null}
        </span>
      ) : null}

      <div className={styles.filterActions}>
        {hasFilters ? (
          <Link className={styles.clearBtn} href="/">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

type SimpleOption = string | { value: string; label: string };

function Field({
  label,
  name,
  value,
  options,
  onFilterChange,
}: {
  label: string;
  name: string;
  value?: string;
  options: SimpleOption[];
  onFilterChange: () => void;
}) {
  return (
    <label className={styles.filterField}>
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ""} onChange={onFilterChange}>
        <option value="">All</option>
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.value;
          const l = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}
