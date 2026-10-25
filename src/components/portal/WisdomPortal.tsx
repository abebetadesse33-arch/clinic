"use client";

import { useMemo, useState } from "react";

const apps = [
  {
    name: "Forma — School management",
    path: "/school",
    category: "Education",
    icon: "🏫",
    tint: "#efecff",
    description:
      "Run your school: students, teachers, lesson plans, timetables, attendance, assessments and report cards.",
  },
  {
    name: "NiniMed",
    path: "/health/",
    category: "Health & wellness",
    icon: "🩺",
    tint: "#fdeeee",
    description: "24/7 primary and urgent healthcare network.",
  },
  {
    name: "Ethiopian Wisdom",
    path: "/wa",
    category: "Culture & heritage",
    icon: "🌿",
    tint: "#e8f6ef",
    description: "Traditional healers and cultural makers, in one directory.",
  },
  {
    name: "Family Feud",
    path: "/feud",
    category: "Games",
    icon: "🎯",
    tint: "#fff2e3",
    description: "The team survey game for classrooms, events and friends.",
  },
  {
    name: "VERITAS AI",
    path: "/paraphrase",
    category: "Writing tools",
    icon: "✍️",
    tint: "#e8f1fd",
    description:
      "Humanizer and paraphraser studio: rewrite text clearly while keeping its meaning.",
  },
];

const categories = ["All apps", ...new Set(apps.map((app) => app.category))];

export default function WisdomPortal() {
  const [category, setCategory] = useState("All apps");
  const [query, setQuery] = useState("");
  const visibleApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return apps.filter((app) => {
      const matchesCategory = category === "All apps" || app.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${app.name} ${app.category} ${app.description}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="min-h-screen bg-[#f6f6fa] text-[#1c1c2b] dark:bg-[#0f0f17] dark:text-[#ececf5]">
      <header className="sticky top-0 z-10 border-b border-[#e8e8f0] bg-white/90 backdrop-blur dark:border-[#2a2a3e] dark:bg-[#171722]/90">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <a className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6352d6] to-[#a48fff] text-white">
              W
            </span>
            Wisdom Course
          </a>
          <label className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-[#e8e8f0] bg-[#f9f9fc] px-3 text-sm text-[#74748a] dark:border-[#2a2a3e] dark:bg-[#1c1c29]">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search apps"
              className="h-10 w-full bg-transparent text-[#1c1c2b] outline-none placeholder:text-[#74748a] dark:text-white"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search apps..."
              type="search"
              value={query}
            />
          </label>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4">
        <section className="py-12">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Everything you need,{" "}
            <span className="bg-gradient-to-r from-[#6352d6] to-[#b18cff] bg-clip-text text-transparent">
              in one place
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#74748a] sm:text-lg dark:text-[#a0a0b5]">
            Choose an app to get started. NiniMed runs here; the other services open on their
            existing sites.
          </p>
        </section>

        <nav aria-label="App categories" className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? "border-[#6352d6] bg-[#6352d6] text-white"
                  : "border-[#e8e8f0] bg-white text-[#48485c] hover:border-[#6352d6] dark:border-[#2a2a3e] dark:bg-[#171722] dark:text-[#c4c4d6]"
              }`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>

        <section aria-live="polite" className="grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {visibleApps.map((app) => (
            <a
              className="flex min-h-56 flex-col gap-4 rounded-2xl border border-[#e8e8f0] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-[#2a2a3e] dark:bg-[#171722]"
              href={app.path}
              key={app.name}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 place-items-center rounded-2xl text-2xl"
                  style={{ backgroundColor: app.tint }}
                >
                  {app.icon}
                </span>
                <div>
                  <h2 className="font-bold">{app.name}</h2>
                  <span className="text-xs font-semibold text-[#6352d6]">{app.category}</span>
                </div>
              </div>
              <p className="flex-1 text-sm leading-6 text-[#74748a] dark:text-[#a0a0b5]">
                {app.description}
              </p>
              <span className="text-sm font-bold text-[#5240c4] dark:text-[#bdb3ff]">
                Open app <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
          {visibleApps.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-[#e8e8f0] p-8 text-center text-[#74748a] dark:border-[#2a2a3e]">
              No apps match your search.
            </p>
          )}
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 border-t border-[#e8e8f0] px-4 py-6 text-sm text-[#74748a] dark:border-[#2a2a3e] dark:text-[#a0a0b5]">
        <span>© {new Date().getFullYear()} Wisdom Course</span>
        <span>One portal · NiniMed at /health</span>
      </footer>
    </div>
  );
}
