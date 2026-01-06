# Gameday Playbook: SSE Resilience

**ID**: GAMEDAY-003
**Scenario**: SSE connection drops and network latency
**Duration**: 1 hour
**Participants**: Frontend, SRE teams
**Severity**: Medium
**Recovery Target**: Reconnect within 5s P95

---

## Objectives

1. Validate client-side reconnection logic
2. Test Last-Event-ID resume functionality
3. Verify exponential backoff with jitter
4. Ensure zero message loss
5. Test boardroom mode offline fallback

---

## Pre-Gameday Checklist

- [ ] Deploy instrumented Corp Cockpit with SSE metrics
- [ ] Verify IndexedDB snapshot cache populated
- [ ] Test Last-Event-ID resume in staging
- [ ] Document expected backoff delays (2s, 4s, 8s, 16s, 32s)

---

## Success Metrics

| Metric | Target | Result |
|--------|--------|--------|
| Reconnect P95 | ≤5s | ___ |
| Message Loss Rate | 0% | ___ |
| Last-Event-ID Resume | ≥99% | ___ |
| Boardroom Mode Fallback | <250ms | ___ |

---

## Execution Steps

See `/chaos/experiments/sse-drop.yaml` for automation.
