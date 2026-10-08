import type { Metadata } from "next";
import { getTimezone } from "@/lib/auth";
import { CirclePlus, Plus, Target, Trash2 } from "lucide-react";
import { getGoals } from "@/lib/data";
import { fmtDate, today } from "@/lib/dates";
import { goalPlan } from "@/lib/finance";
import { formatINR } from "@/lib/money";
import { Ring } from "@/components/charts/Donut";
import { Empty, PageHead } from "@/components/ui/Page";
import { ConfirmButton } from "@/components/ui/Form";
import { ContributeButton, GoalButton } from "@/features/finance/forms";
import { deleteGoal } from "@/features/finance/actions";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const goals = await getGoals();
  const ref = today(await getTimezone());
  const add = <GoalButton trigger={<><Plus size={16} />New goal</>} />;
  return (
    <>
      <PageHead eyebrow="Saving for what matters" title="Goals" actions={add} />
      {goals.length ? (
        <div className="cards-grid">{goals.map((g) => {
          const p = goalPlan(g.target, g.saved, g.target_date, ref);
          return (
            <article className="goal g3" key={g.id}>
              <div className="goal-top">
                <div className="ring"><Ring p={p.progress} tone={p.progress >= 1 ? "pos" : "accent"} /><span className="c">{Math.round(p.progress * 100)}%</span></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h2 className="h3">{g.name}</h2><span className={`pill plain ${g.priority === "high" ? "warn" : ""}`}>{g.priority[0].toUpperCase() + g.priority.slice(1)}</span></div>
                  <div className="stat" style={{ fontSize: 24, marginTop: 4 }}>{formatINR(g.saved)}</div>
                  <div className="xs muted">of {formatINR(g.target)}</div>
                </div>
              </div>
              <div className="kv">
                <div><div className="k">Remaining</div><div className="v">{formatINR(p.remaining)}</div></div>
                <div><div className="k">Target date</div><div className="v">{fmtDate(g.target_date, { month: "short", year: "numeric" })}</div></div>
                <div><div className="k">Months left</div><div className="v">{p.months}</div></div>
              </div>
              <div className="calcbox">
                <div className="ln"><span>Suggested monthly saving</span><span>{p.remaining ? formatINR(p.monthly) : "Goal reached"}</span></div>
                <div className="ln" style={{ color: "var(--ink-3)" }}><span>{formatINR(p.remaining)} ÷ {p.months} months</span><span className="tag est" style={{ fontFamily: "var(--f-sans)" }}>Estimate</span></div>
              </div>
              <div className="card-actions">
                <ContributeButton goalId={g.id} name={g.name} triggerClass="btn btn-primary btn-sm" trigger={<><CirclePlus size={15} />Add money</>} />
                <ConfirmButton action={deleteGoal} id={g.id} title={`Remove ${g.name}?`} body="The goal and its saved progress will be removed. This can’t be undone." cta="Remove goal" trigger={<><Trash2 size={15} />Remove</>} />
              </div>
            </article>
          );
        })}</div>
      ) : (
        <section className="card g2"><Empty icon={<Target size={26} />} title="No goals yet" body="Create a goal for an emergency fund, a trip or a laptop. Sam works out how much to save each month.">{add}</Empty></section>
      )}
    </>
  );
}
