/**
 * TeamAdminPage — /team-admin
 * Privacy-first team seat management.
 * Billing admin sees: seat holder name, email, invite status, join date.
 * Billing admin sees ZERO capability data (enforced server-side too).
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, UserPlus, UserMinus, Mail, Clock, CheckCircle2,
  Shield, AlertTriangle, Loader2, RefreshCw, CreditCard,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

const navy  = "#0F172A";
const slate = "#1E293B";
const chalk = "#F8FAFC";
const muted = "#94A3B8";
const teal  = "#0EA5E9";
const coral = "#FF6B6B";
const green = "#22C55E";
const amber = "#F59E0B";
const border = "rgba(255,255,255,0.08)";

type SeatStatus = "active" | "invited" | "expired";

interface Seat {
  id: string;
  inviteEmail: string;
  status: SeatStatus;
  addedAt: Date;
  removedAt: Date | null;
}

function statusBadge(status: SeatStatus) {
  if (status === "active")  return <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(34,197,94,0.15)", color: green, border: "none" }}>Active</Badge>;
  if (status === "invited") return <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(245,158,11,0.15)", color: amber, border: "none" }}>Invited</Badge>;
  return <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(239,68,68,0.15)", color: coral, border: "none" }}>Expired</Badge>;
}

function formatDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TeamAdminPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.commercial.team.getSubscription.useQuery();
  const inviteMutation = trpc.commercial.team.inviteMember.useMutation({
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const removeMutation = trpc.commercial.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Seat removed.");
      setRemovingId(null);
      setConfirmRemove(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setRemovingId(null);
    },
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), origin: window.location.origin });
  }

  function handleRemove(memberId: string) {
    if (confirmRemove !== memberId) { setConfirmRemove(memberId); return; }
    setRemovingId(memberId);
    removeMutation.mutate({ memberId });
  }

  const seats: Seat[] = (data?.members ?? []) as Seat[];
  const totalSeats = data?.seatCount ?? 0;
  const usedSeats  = seats.filter(s => s.status === "active").length;
  const pendingInvites = seats.filter(s => s.status === "invited").length;

  return (
    <div style={{ background: navy, minHeight: "100vh", color: chalk }}>
      {/* Header */}
      <div style={{ background: slate, borderBottom: `1px solid ${border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: muted }}>
            <Link href="/billing"><span className="hover:underline cursor-pointer">Billing</span></Link>
            <ChevronRight size={12} />
            <span>Team admin</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.15)" }}>
                <Users size={20} style={{ color: teal }} />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: chalk }}>Team admin</h1>
                <p className="text-xs" style={{ color: muted }}>{usedSeats} of {totalSeats} seats active · {pendingInvites} pending</p>
              </div>
            </div>
            <Link href="/billing">
              <Button variant="outline" size="sm" className="text-xs" style={{ borderColor: border, color: chalk }}>
                <CreditCard size={14} className="mr-1.5" />Billing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Privacy notice */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(14,165,233,0.06)", border: `1px solid rgba(14,165,233,0.2)` }}>
          <Shield size={16} className="mt-0.5 shrink-0" style={{ color: teal }} />
          <div>
            <p className="text-sm font-medium" style={{ color: teal }}>Privacy-first design</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: muted }}>
              As billing admin you can see who holds a seat and their invite status. You cannot see any capability scores, assessment results, or learning data — that belongs to each individual learner.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total seats", value: totalSeats, color: chalk },
            { label: "Active members", value: usedSeats, color: green },
            { label: "Pending invites", value: pendingInvites, color: amber },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: slate, border: `1px solid ${border}` }}>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: muted }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div className="rounded-xl p-5" style={{ background: slate, border: `1px solid ${border}` }}>
          <p className="text-sm font-semibold mb-3" style={{ color: chalk }}>Invite a team member</p>
          <form onSubmit={handleInvite} className="flex gap-3">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 text-sm"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: border, color: chalk }}
            />
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
              style={{ background: teal, color: "#fff" }}
              className="shrink-0"
            >
              {inviteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} className="mr-1.5" />Send invite</>}
            </Button>
          </form>
          {usedSeats + pendingInvites >= totalSeats && (
            <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: amber }}>
              <AlertTriangle size={13} />
              <span>All seats are used. <Link href="/billing"><span className="underline cursor-pointer">Add more seats</span></Link> to invite more members.</span>
            </div>
          )}
        </div>

        {/* Seat list */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: slate }}>
            <p className="text-sm font-semibold" style={{ color: chalk }}>Seat holders</p>
            <button onClick={() => refetch()} className="text-xs flex items-center gap-1 hover:opacity-80" style={{ color: muted }}>
              <RefreshCw size={12} />Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12" style={{ background: navy }}>
              <Loader2 size={20} className="animate-spin" style={{ color: muted }} />
            </div>
          ) : seats.length === 0 ? (
            <div className="py-12 text-center" style={{ background: navy }}>
              <Users size={32} className="mx-auto mb-3" style={{ color: muted }} />
              <p className="text-sm" style={{ color: muted }}>No seats yet. Invite your first team member above.</p>
            </div>
          ) : (
            <table className="w-full text-sm" style={{ background: navy }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: muted }}>Member</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: muted }}>Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: muted }}>Invited</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: muted }}>Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {seats.map((seat, i) => (
                  <tr key={seat.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${border}` }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(14,165,233,0.15)", color: teal }}>
                          {seat.inviteEmail[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: muted }}>{seat.inviteEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">{statusBadge(seat.status)}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: muted }}>{seat.addedAt ? new Date(seat.addedAt).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: muted }}>{seat.status === "active" ? "Active" : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      {confirmRemove === seat.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs" style={{ color: coral }}>Remove?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7 px-2"
                            disabled={removingId === seat.id}
                            onClick={() => handleRemove(seat.id)}
                          >
                            {removingId === seat.id ? <Loader2 size={12} className="animate-spin" /> : "Yes"}
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2" style={{ borderColor: border, color: chalk }} onClick={() => setConfirmRemove(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs hover:opacity-80 flex items-center gap-1"
                          style={{ color: muted }}
                          onClick={() => setConfirmRemove(seat.id)}
                        >
                          <UserMinus size={13} />Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Capability data notice */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.04)", border: `1px solid rgba(239,68,68,0.15)` }}>
          <Shield size={16} className="mt-0.5 shrink-0" style={{ color: coral }} />
          <p className="text-xs leading-relaxed" style={{ color: muted }}>
            <strong style={{ color: chalk }}>No capability data is shown here.</strong> Assessment scores, learning progress, and capability profiles are private to each individual. This is a structural privacy guarantee — not a display preference.
          </p>
        </div>
      </div>
    </div>
  );
}
