"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { saveWorkflowTemplate, type WorkflowStepInput, type WorkflowEdgeInput } from "@/lib/actions/workflows";
import type { WorkflowAssigneeMode, WorkflowJoinMode, WorkflowStepType } from "@/lib/supabase/types";

type StepNodeData = {
  label: string;
  step_type: WorkflowStepType;
  assignee_mode: WorkflowAssigneeMode;
  assignee_org_id: string | null;
  assignee_user_id: string | null;
  assignee_role: string | null;
  join_mode: WorkflowJoinMode;
  allow_hold: boolean;
  summary: string;
};

type StepNode = Node<StepNodeData, "step">;

type OrgMember = { id: string; name: string };

function summarize(data: Omit<StepNodeData, "summary">, orgMembers: OrgMember[]) {
  if (data.step_type === "external" && !data.assignee_org_id) {
    if (data.assignee_mode === "org_role") return `External · any ${data.assignee_role ?? "member"} (org set at start)`;
    return "External · any member (org set at start)";
  }
  if (data.assignee_mode === "specific_user") {
    const member = orgMembers.find((m) => m.id === data.assignee_user_id);
    return member ? member.name : "Specific person (not set)";
  }
  if (data.assignee_mode === "org_role") {
    return `Any ${data.assignee_role ?? "member"}`;
  }
  return "Any member";
}

function StepNodeCard({ data, selected }: NodeProps<StepNode>) {
  return (
    <div
      className={`w-56 rounded-lg border-2 bg-white p-3 shadow-sm ${
        selected ? "border-brand" : "border-surface-border"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-brand" />
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
          data.step_type === "internal" ? "bg-surface text-neutral-600" : "bg-brand-tint text-brand"
        }`}
      >
        {data.step_type === "internal" ? "Internal" : "External"}
      </span>
      <div className="mt-1 text-sm font-medium text-foreground">{data.label || "Untitled step"}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{data.summary}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-brand" />
    </div>
  );
}

const nodeTypes = { step: StepNodeCard };

function newStep(stepType: WorkflowStepType, orgId: string, index: number): StepNode {
  const base = {
    label: stepType === "internal" ? "Internal review" : "External review",
    step_type: stepType,
    assignee_mode: "org_member" as WorkflowAssigneeMode,
    assignee_org_id: stepType === "internal" ? orgId : null,
    assignee_user_id: null,
    assignee_role: null,
    join_mode: "all" as WorkflowJoinMode,
    allow_hold: true,
  };
  return {
    id: crypto.randomUUID(),
    type: "step",
    position: { x: 80 + (index % 4) * 220, y: 80 + Math.floor(index / 4) * 160 },
    data: { ...base, summary: summarize(base, []) },
  };
}

function hasCycle(nodeIds: string[], edges: { source: string; target: string }[]) {
  const remaining = new Set(nodeIds);
  while (remaining.size > 0) {
    const removable = [...remaining].filter(
      (n) => !edges.some((e) => e.target === n && remaining.has(e.source))
    );
    if (removable.length === 0) return true;
    removable.forEach((n) => remaining.delete(n));
  }
  return false;
}

export default function WorkflowBuilder({
  orgId,
  templateId,
  initialName,
  initialDescription,
  initialSteps,
  initialEdges,
  orgMembers,
}: {
  orgId: string;
  templateId: string | null;
  initialName: string;
  initialDescription: string;
  initialSteps: WorkflowStepInput[];
  initialEdges: WorkflowEdgeInput[];
  orgMembers: OrgMember[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [nodes, setNodes] = useState<StepNode[]>(() =>
    initialSteps.map((s) => {
      const data = {
        label: s.label,
        step_type: s.step_type,
        assignee_mode: s.assignee_mode,
        assignee_org_id: s.assignee_org_id,
        assignee_user_id: s.assignee_user_id,
        assignee_role: s.assignee_role,
        join_mode: s.join_mode,
        allow_hold: s.allow_hold,
      };
      return {
        id: s.id,
        type: "step" as const,
        position: { x: s.position_x, y: s.position_y },
        data: { ...data, summary: summarize(data, orgMembers) },
      };
    })
  );
  const [edges, setEdges] = useState<Edge[]>(() =>
    initialEdges.map((e) => ({
      id: `${e.from_step_id}-${e.to_step_id}`,
      source: e.from_step_id,
      target: e.to_step_id,
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  function updateSelected(patch: Partial<Omit<StepNodeData, "summary">>) {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedId) return n;
        const data = { ...n.data, ...patch };
        return { ...n, data: { ...data, summary: summarize(data, orgMembers) } };
      })
    );
  }

  function addStep(stepType: WorkflowStepType) {
    const node = newStep(stepType, orgId, nodes.length);
    setNodes((nds) => [...nds, node]);
    setSelectedId(node.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }

  const incomingCount = useMemo(
    () => (selectedId ? edges.filter((e) => e.target === selectedId).length : 0),
    [edges, selectedId]
  );

  async function handleSave() {
    setError(undefined);
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (nodes.length === 0) {
      setError("Add at least one step.");
      return;
    }
    if (hasCycle(nodes.map((n) => n.id), edges.map((e) => ({ source: e.source, target: e.target })))) {
      setError("This workflow has a cycle — remove the connection that loops back.");
      return;
    }

    setSaving(true);
    const stepsInput: WorkflowStepInput[] = nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      step_type: n.data.step_type,
      assignee_mode: n.data.assignee_mode,
      assignee_org_id: n.data.assignee_org_id,
      assignee_user_id: n.data.assignee_user_id,
      assignee_role: n.data.assignee_role,
      join_mode: n.data.join_mode,
      allow_hold: n.data.allow_hold,
      position_x: n.position.x,
      position_y: n.position.y,
    }));
    const edgesInput: WorkflowEdgeInput[] = edges.map((e) => ({
      from_step_id: e.source,
      to_step_id: e.target,
    }));

    const result = await saveWorkflowTemplate(orgId, templateId, name, description, stepsInput, edgesInput);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!templateId && result.id) {
      router.replace(`/workflows/${result.id}/edit`);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Template name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 rounded-lg border border-surface-border px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-surface-border px-3 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save template"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => addStep("internal")}
              className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-border"
            >
              + Internal step
            </button>
            <button
              type="button"
              onClick={() => addStep("external")}
              className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-border"
            >
              + External step
            </button>
          </div>
          <div className="h-[70vh] rounded-lg border border-surface-border">
            <ReactFlow<StepNode>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Drag from a step&apos;s bottom handle to another step&apos;s top handle to connect them. Select a
            connection and press Delete to remove it.
          </p>
        </div>

        {selected && (
          <div className="w-72 shrink-0 rounded-lg border border-surface-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Step settings</h3>
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                Label
                <input
                  value={selected.data.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                  className="rounded-lg border border-surface-border px-2 py-1.5 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>

              {selected.data.step_type === "internal" ? (
                <label className="flex flex-col gap-1">
                  Assignee
                  <select
                    value={selected.data.assignee_mode}
                    onChange={(e) =>
                      updateSelected({
                        assignee_mode: e.target.value as WorkflowAssigneeMode,
                        assignee_user_id: null,
                        assignee_role: null,
                      })
                    }
                    className="rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    <option value="org_member">Any member of our org</option>
                    <option value="org_role">Any org role...</option>
                    <option value="specific_user">A specific person</option>
                  </select>
                </label>
              ) : (
                <label className="flex flex-col gap-1">
                  Assignee (org chosen when workflow starts)
                  <select
                    value={selected.data.assignee_mode}
                    onChange={(e) =>
                      updateSelected({ assignee_mode: e.target.value as WorkflowAssigneeMode, assignee_role: null })
                    }
                    className="rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    <option value="org_member">Any member</option>
                    <option value="org_role">Any org role...</option>
                  </select>
                </label>
              )}

              {selected.data.assignee_mode === "org_role" && (
                <label className="flex flex-col gap-1">
                  Role
                  <select
                    value={selected.data.assignee_role ?? "member"}
                    onChange={(e) => updateSelected({ assignee_role: e.target.value })}
                    className="rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </label>
              )}

              {selected.data.step_type === "internal" && selected.data.assignee_mode === "specific_user" && (
                <label className="flex flex-col gap-1">
                  Person
                  <select
                    value={selected.data.assignee_user_id ?? ""}
                    onChange={(e) => updateSelected({ assignee_user_id: e.target.value || null })}
                    className="rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    <option value="">Choose...</option>
                    {orgMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {incomingCount > 1 && (
                <label className="flex flex-col gap-1">
                  When multiple paths lead here
                  <select
                    value={selected.data.join_mode}
                    onChange={(e) => updateSelected({ join_mode: e.target.value as WorkflowJoinMode })}
                    className="rounded-lg border border-surface-border px-2 py-1.5"
                  >
                    <option value="all">Require all of them</option>
                    <option value="any">Require any one of them</option>
                  </select>
                </label>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.data.allow_hold}
                  onChange={(e) => updateSelected({ allow_hold: e.target.checked })}
                />
                Allow this step to be put on hold
              </label>

              <button
                type="button"
                onClick={deleteSelected}
                className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Delete step
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
