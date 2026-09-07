"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  Filter,
  ArrowUpRight,
  PieChart,
  Calculator,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export default function PopulationHealthPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "calculators">("overview");

  // Calculator State
  const [calcTab, setCalcTab] = useState<"ascvd" | "diabetes" | "news2">("ascvd");
  const [calcInputs, setCalcInputs] = useState({
    age: 56,
    gender: "male" as "male" | "female",
    sbp: 148,
    tc: 220,
    hdl: 42,
    bmi: 31.2,
    isSmoker: true,
    hasDiabetes: true,
    rr: 22,
    spo2: 94,
    pulse: 105,
    temp: 38.4,
  });

  const [calcResult, setCalcResult] = useState<any>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/admin/population-health");
      const json = await res.json();
      if (json.summary) {
        setData(json.summary);
      }
    } catch (e) {
      console.error("Fetch metrics error:", e);
    }
  };

  const calculateRisk = async () => {
    try {
      const params = new URLSearchParams({
        age: calcInputs.age.toString(),
        gender: calcInputs.gender,
        sbp: calcInputs.sbp.toString(),
        tc: calcInputs.tc.toString(),
        hdl: calcInputs.hdl.toString(),
        bmi: calcInputs.bmi.toString(),
      });
      const res = await fetch(`/api/v1/patients/demo-patient/risk-scores?${params}`);
      const json = await res.json();
      if (json.models) {
        setCalcResult(json.models);
      }
    } catch (e) {
      console.error("Calculate risk error:", e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    calculateRisk();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Population Health & Predictive Risk Center</h1>
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  HEDIS / MIPS Analytics
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Stratified cohort risk pyramids, HEDIS quality gaps, and automated disease risk calculators
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#121222] p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "overview" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20" : "text-gray-400 hover:text-white"
              }`}
            >
              Population Overview
            </button>
            <button
              onClick={() => setActiveTab("calculators")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "calculators" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20" : "text-gray-400 hover:text-white"
              }`}
            >
              Predictive Calculators
            </button>
          </div>
        </div>
      </div>

      {activeTab === "overview" && data && (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Cohort Stratification Pyramid */}
          <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Patient Risk Stratification Pyramid ({data.cohortDistribution.totalPopulation.toLocaleString()} Active Lives)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">High Risk Tier</span>
                  <span className="text-xs font-mono font-bold text-rose-300">{data.cohortDistribution.highRiskPercentage}%</span>
                </div>
                <div className="text-2xl font-black text-white">{data.cohortDistribution.highRiskCount} patients</div>
                <p className="text-xs text-gray-400 mt-2">Multiple chronic comorbidities (Diabetes + CKD + HTN), high hospital readmission risk.</p>
              </div>

              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Rising Risk Tier</span>
                  <span className="text-xs font-mono font-bold text-amber-300">{data.cohortDistribution.risingRiskPercentage}%</span>
                </div>
                <div className="text-2xl font-black text-white">{data.cohortDistribution.risingRiskCount} patients</div>
                <p className="text-xs text-gray-400 mt-2">Emerging metabolic syndrome, pre-diabetes, and borderline hypertension.</p>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Low / Healthy Tier</span>
                  <span className="text-xs font-mono font-bold text-emerald-300">{data.cohortDistribution.lowRiskPercentage}%</span>
                </div>
                <div className="text-2xl font-black text-white">{data.cohortDistribution.lowRiskCount} patients</div>
                <p className="text-xs text-gray-400 mt-2">Routine preventive care, well-managed vitals, and normal biometric screening.</p>
              </div>
            </div>
          </div>

          {/* HEDIS Quality Measures & Care Gaps */}
          <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> HEDIS / MIPS Clinical Quality Measures & Care Gap Tracking
            </h2>
            <div className="space-y-4">
              {data.hedisMeasures.map((measure: any) => (
                <div key={measure.id} className="p-4 bg-[#18182e] rounded-xl border border-gray-800/80">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-mono text-cyan-400 font-bold">{measure.id}</div>
                      <div className="text-sm font-semibold text-white">{measure.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        measure.status === "on_track"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : measure.status === "needs_attention"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}>
                        {measure.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-rose-400 font-bold">{measure.careGapsIdentified} care gaps</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full ${
                        measure.complianceRatePercent >= measure.targetBenchmarkPercent ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${measure.complianceRatePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Compliance: {measure.complianceRatePercent}% ({measure.compliantCount}/{measure.eligiblePopulation} patients)</span>
                    <span>Target Benchmark: {measure.targetBenchmarkPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "calculators" && calcResult && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Side */}
          <div className="lg:col-span-5 bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" /> Patient Parameter Inputs
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Age</label>
                <input
                  type="number"
                  value={calcInputs.age}
                  onChange={(e) => setCalcInputs({ ...calcInputs, age: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#18182e] border border-gray-700/60 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Gender</label>
                <select
                  value={calcInputs.gender}
                  onChange={(e) => setCalcInputs({ ...calcInputs, gender: e.target.value as "male" | "female" })}
                  className="w-full bg-[#18182e] border border-gray-700/60 rounded-lg px-3 py-2 text-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  value={calcInputs.sbp}
                  onChange={(e) => setCalcInputs({ ...calcInputs, sbp: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#18182e] border border-gray-700/60 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">BMI</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcInputs.bmi}
                  onChange={(e) => setCalcInputs({ ...calcInputs, bmi: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#18182e] border border-gray-700/60 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Total Cholesterol</label>
                <input
                  type="number"
                  value={calcInputs.tc}
                  onChange={(e) => setCalcInputs({ ...calcInputs, tc: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#18182e] border border-gray-700/60 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">HDL Cholesterol</label>
                <input
                  type="number"
                  value={calcInputs.hdl}
                  onChange={(e) => setCalcInputs({ ...calcInputs, hdl: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#18182e] border border-gray-700/60 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <button
              onClick={calculateRisk}
              className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-cyan-600/20 transition-all"
            >
              Re-Calculate Risk Engine
            </button>
          </div>

          {/* Results Side */}
          <div className="lg:col-span-7 space-y-4">
            {/* 10-Year ASCVD Risk Card */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" /> 10-Year ASCVD Cardiovascular Risk
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold uppercase">
                  {calcResult.ascvd_10yr.riskCategory} Risk
                </span>
              </div>
              <div className="text-3xl font-black text-white mb-2">{calcResult.ascvd_10yr.tenYearRiskPercent}%</div>
              <div className="space-y-1 text-xs text-gray-300">
                {calcResult.ascvd_10yr.recommendations.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ADA Diabetes Risk Card */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> ADA Type 2 Diabetes Score
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase">
                  {calcResult.diabetes_type2.riskCategory} Risk
                </span>
              </div>
              <div className="text-3xl font-black text-white mb-2">{calcResult.diabetes_type2.score} / 11 pts</div>
              <div className="space-y-1 text-xs text-gray-300">
                {calcResult.diabetes_type2.recommendations.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NEWS2 Deterioration Card */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> NEWS2 Early Warning Score
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold uppercase">
                  {calcResult.news2_early_warning.clinicalRisk} Risk
                </span>
              </div>
              <div className="text-3xl font-black text-white mb-2">Score: {calcResult.news2_early_warning.totalScore}</div>
              <p className="text-xs text-gray-300">{calcResult.news2_early_warning.responseLevel}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
