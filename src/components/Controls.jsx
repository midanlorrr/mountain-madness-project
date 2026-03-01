export function Controls({ sessionActive, onStart, onStop, onReset }) {
  return (
    <section
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={onStart}
        disabled={sessionActive}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          fontWeight: 'bold',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: sessionActive ? 'not-allowed' : 'pointer',
          opacity: sessionActive ? 0.5 : 1,
        }}
      >
        ▶️ Start Session
      </button>

      <button
        onClick={onStop}
        disabled={!sessionActive}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          fontWeight: 'bold',
          backgroundColor: '#F44336',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: !sessionActive ? 'not-allowed' : 'pointer',
          opacity: !sessionActive ? 0.5 : 1,
        }}
      >
        ⏹️ Stop Session
      </button>

      <button
        onClick={onReset}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          fontWeight: 'bold',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        🔄 Clear Transcript
      </button>
    </section>
  )
}
