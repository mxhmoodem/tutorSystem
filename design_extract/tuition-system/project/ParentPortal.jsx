// ══════════════════════════════════════════════════════════════
//  TutorOS — Parent Portal
// ══════════════════════════════════════════════════════════════

const parentData = {
  child: 'Oliver Chen',
  year: 'Year 12',
  subjects: [
    { name: 'Mathematics',  score: 94, predicted: 'A*', attendance: 98, change: +4  },
    { name: 'Further Maths',score: 88, predicted: 'A',  attendance: 96, change: +2  },
    { name: 'Physics',      score: 81, predicted: 'A',  attendance: 94, change: -1  },
  ],
  recentHw: [
    {
      title: 'Calculus: Differentiation Basics',
      subject: 'Mathematics',
      submitted: '23 Apr',
      score: 92,
      teacher: 'Ms. Sarah Clarke',
      feedback: 'Excellent work — your chain rule application is correct. Consider showing intermediate steps for full marks in the exam.',
      questions: [
        { q: 'Q1 — Differentiate f(x) = 3x⁴ − 2x² + 5',        mark: true,  comment: 'Correct — well shown' },
        { q: 'Q2 — Find dy/dx for y = sin(2x)cos(x)',            mark: true,  comment: 'Correct method, good notation' },
        { q: 'Q3 — Differentiate using the product rule',         mark: true,  comment: 'All steps shown clearly' },
        { q: 'Q4 — Chain rule: f(x) = (3x² + 1)⁵',              mark: false, comment: 'Sign error at expansion — see note' },
        { q: 'Q5 — Stationary points of f(x) = x³ − 6x² + 9x',  mark: true,  comment: 'Correct' },
        { q: 'Q6 — Second derivative classification',             mark: true,  comment: 'Correct' },
      ],
    },
    {
      title: 'Algebra: Quadratic Sequences',
      subject: 'Mathematics',
      submitted: '16 Apr',
      score: 87,
      teacher: 'Ms. Sarah Clarke',
      feedback: 'Strong performance. The nth term calculation in Q3 had a small error but all other answers were correct.',
      questions: [
        { q: 'Q1 — Find next 3 terms of 3, 7, 13, 21…',     mark: true,  comment: 'Correct' },
        { q: 'Q2 — Determine whether sequence is quadratic', mark: true,  comment: 'Good reasoning shown' },
        { q: 'Q3 — Find nth term for: 2, 6, 12, 20, 30…',   mark: false, comment: 'Small error in coefficient — recheck step 2' },
        { q: 'Q4 — Prove the general formula',               mark: true,  comment: 'Excellent algebraic proof' },
      ],
    },
  ],
  upcomingSessions: [
    { subject: 'Mathematics',   date: 'Mon 28 Apr', time: '09:00 – 10:30', room: 'Room 3', teacher: 'Ms. Sarah Clarke'  },
    { subject: 'Further Maths', date: 'Wed 30 Apr', time: '10:30 – 12:00', room: 'Room 5', teacher: 'Ms. Sarah Clarke'  },
    { subject: 'Physics',       date: 'Thu 1 May',  time: '14:00 – 15:30', room: 'Room 7', teacher: 'Mr. David Park'    },
    { subject: 'Mathematics',   date: 'Fri 2 May',  time: '09:00 – 10:30', room: 'Room 3', teacher: 'Ms. Sarah Clarke'  },
  ],
  messages: [
    { from: 'teacher', name: 'Ms. Sarah Clarke', text: 'Oliver did really well in this week\'s test — his differentiation is excellent. I\'d like him to focus on showing workings more clearly in exam conditions.', time: '2:14 PM · Today' },
    { from: 'parent',  name: 'You',              text: 'Thank you! He\'s been putting in a lot of extra practice. Is there anything specific he should revise for the mock in two weeks?', time: '2:31 PM · Today' },
    { from: 'teacher', name: 'Ms. Sarah Clarke', text: 'Integration by parts and implicit differentiation would be the highest-value topics to review. I\'ll share some practice papers on Monday.', time: '2:45 PM · Today' },
  ],
};

const ParentPortal = () => {
  const [expandedHw, setExpandedHw] = React.useState(0);
  const [messageText, setMessageText] = React.useState('');
  const [messages, setMessages] = React.useState(parentData.messages);

  const sendMessage = () => {
    if (!messageText.trim()) return;
    setMessages(prev => [
      ...prev,
      { from: 'parent', name: 'You', text: messageText, time: 'Just now' }
    ]);
    setMessageText('');
  };

  const subjectColors = { 'Mathematics': DS.accent, 'Further Maths': '#7C3AED', 'Physics': '#0891B2' };

  return (
    <div style={{ flex: 1, padding: '32px', overflow: 'auto', minWidth: 0 }}>
      {/* Header with child info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={parentData.child} size={48} color={DS.accent} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: DS.text, margin: '0 0 2px', letterSpacing: '-0.4px' }}>
              {parentData.child}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: DS.muted }}>{parentData.year}</span>
              <span style={{ color: DS.border }}>·</span>
              <Badge variant="success">On track</Badge>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" icon="message" small>Message Teacher</Btn>
          <Btn variant="secondary" icon="download" small>Download Report</Btn>
        </div>
      </div>

      {/* ── Performance Summary ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {parentData.subjects.map(s => (
          <div key={s.name} style={{
            background: DS.bg, border: `1px solid ${DS.border}`,
            borderRadius: 10, padding: '20px', borderTop: `3px solid ${subjectColors[s.name] || DS.accent}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: DS.muted, marginBottom: 14 }}>{s.name}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: DS.text, lineHeight: 1, letterSpacing: '-1px' }}>{s.score}%</div>
                <div style={{ fontSize: 12, color: DS.muted, marginTop: 4 }}>Latest score</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: subjectColors[s.name] || DS.accent }}>{s.predicted}</div>
                <div style={{ fontSize: 12, color: DS.muted }}>Predicted</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${DS.border}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: DS.muted }}>Attendance</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.attendance > 95 ? DS.success : DS.warning }}>{s.attendance}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: DS.muted }}>Since last report</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.change >= 0 ? DS.success : DS.danger }}>
                  {s.change >= 0 ? '+' : ''}{s.change}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column: Homework + Right panel ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Homework results with AI feedback */}
        <div>
          <Card title="Recent Homework Results" style={{ marginBottom: 20 }} actions={[
            <Btn key="v" variant="ghost" icon="eye" small>All homework</Btn>
          ]}>
            {parentData.recentHw.map((hw, i) => {
              const isOpen = expandedHw === i;
              return (
                <div key={i} style={{ borderBottom: i < parentData.recentHw.length - 1 ? `1px solid ${DS.border}` : 'none' }}>
                  <div
                    style={{ padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setExpandedHw(isOpen ? null : i)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: DS.text, marginBottom: 3 }}>{hw.title}</div>
                        <div style={{ fontSize: 12, color: DS.muted }}>{hw.subject} · Submitted {hw.submitted} · {hw.teacher}</div>
                      </div>
                      <ScorePill score={hw.score} />
                      <Icon name={isOpen ? 'chevron_d' : 'chevron_r'} size={14} color={DS.faint} />
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '0 20px 20px' }}>
                      {/* Teacher feedback */}
                      <div style={{
                        background: DS.accentLight, border: `1px solid ${DS.accentBorder}`,
                        borderRadius: 8, padding: '12px 14px', marginBottom: 16,
                      }}>
                        <div style={{ fontSize: 11, color: DS.accent, fontWeight: 600, marginBottom: 6 }}>
                          TEACHER FEEDBACK
                        </div>
                        <p style={{ fontSize: 13, color: DS.sub, margin: 0, lineHeight: 1.65 }}>{hw.feedback}</p>
                      </div>

                      {/* Per-question breakdown */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: DS.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Per-question breakdown
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {hw.questions.map((q, qi) => (
                          <div key={qi} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '9px 12px', borderRadius: 7,
                            background: q.mark ? DS.successBg : DS.dangerBg,
                            border: `1px solid ${q.mark ? DS.successBorder : DS.dangerBorder}`,
                          }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                              background: q.mark ? DS.success : DS.danger,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon name={q.mark ? 'check' : 'x'} size={10} color="#fff" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: DS.sub }}>{q.q}</div>
                              <div style={{ fontSize: 11, color: DS.muted, marginTop: 2 }}>{q.comment}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Score trend chart */}
          <Card title="Score Trend — Mathematics" actions={[<Badge key="b" variant="default">Last 8 weeks</Badge>]}>
            <div style={{ padding: '16px 20px 8px' }}>
              <LineChart
                labels={['4 Mar', '11 Mar', '18 Mar', '25 Mar', '1 Apr', '8 Apr', '15 Apr', '22 Apr']}
                series={[
                  { label: 'Oliver', data: [82, 85, 84, 88, 90, 89, 92, 94], color: DS.accent },
                  { label: 'Class avg', data: [70, 71, 69, 72, 73, 71, 74, 75], color: DS.border },
                ]}
                height={160}
              />
            </div>
            <div style={{ display: 'flex', gap: 16, padding: '10px 20px', borderTop: `1px solid ${DS.border}`, background: DS.surface }}>
              {[['Oliver', DS.accent, '94%'], ['Class avg', DS.faint, '75%']].map(([l, c, v]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 2, background: c, borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: DS.muted }}>{l}: <strong style={{ color: DS.text }}>{v}</strong></span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Upcoming sessions + Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upcoming sessions */}
          <Card title="Upcoming Sessions" actions={[<Badge key="b" variant="accent">4 this week</Badge>]}>
            <div style={{ padding: '8px 0' }}>
              {parentData.upcomingSessions.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  borderBottom: i < parentData.upcomingSessions.length - 1 ? `1px solid ${DS.border}` : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: (subjectColors[s.subject] || DS.accent) + '18',
                    border: `1px solid ${(subjectColors[s.subject] || DS.accent) + '30'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: subjectColors[s.subject] || DS.accent,
                  }}>
                    <Icon name="calendar" size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DS.text }}>{s.subject}</div>
                    <div style={{ fontSize: 12, color: DS.muted, marginTop: 2 }}>{s.date} · {s.time}</div>
                    <div style={{ fontSize: 11, color: DS.faint, marginTop: 1 }}>{s.teacher} · {s.room}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Message thread */}
          <Card title="Messages" style={{ flex: 1 }} actions={[
            <Badge key="b" variant="accent">Ms. Clarke</Badge>
          ]}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => {
                const isMe = m.from === 'parent';
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    {!isMe && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Avatar name={m.name} size={22} color="#0D9488" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: DS.muted }}>{m.name}</span>
                      </div>
                    )}
                    <div style={{
                      maxWidth: '85%',
                      background: isMe ? DS.accent : DS.surface,
                      color: isMe ? '#fff' : DS.sub,
                      border: `1px solid ${isMe ? DS.accentHover : DS.border}`,
                      borderRadius: isMe ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                      padding: '9px 12px',
                      fontSize: 13, lineHeight: 1.55,
                    }}>
                      {m.text}
                    </div>
                    <div style={{ fontSize: 10, color: DS.faint, marginTop: 3 }}>{m.time}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Message Ms. Clarke…"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 7,
                    border: `1px solid ${DS.border}`, fontSize: 13,
                    outline: 'none', color: DS.text, background: DS.surface,
                  }}
                />
                <Btn variant="primary" icon="chevron_r" onClick={sendMessage} small>Send</Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ParentPortal });
