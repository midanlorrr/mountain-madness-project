export function SpeechTranscript({ transcript, interimTranscript, isListening, error, isSupported }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Speech Analysis</h2>

      {!isSupported && (
        <div
          style={{
            padding: 12,
            backgroundColor: '#FFEBEE',
            border: '2px solid #F44336',
            borderRadius: 4,
            color: '#C62828',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {error && isSupported && (
        <div
          style={{
            padding: 12,
            backgroundColor: '#FFF3E0',
            border: '2px solid #FF9800',
            borderRadius: 4,
            color: '#E65100',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Transcript Box */}
      <div
        style={{
          padding: 16,
          backgroundColor: '#FAFAFA',
          border: '2px solid #E0E0E0',
          borderRadius: 8,
          minHeight: 100,
          marginBottom: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {transcript || <em style={{ color: '#999' }}>Your words will appear here...</em>}
        {interimTranscript && (
          <span style={{ color: '#999', fontStyle: 'italic' }}> {interimTranscript}</span>
        )}
      </div>

      {/* Status */}
      <div
        style={{
          padding: 12,
          backgroundColor: isListening ? '#E8F5E9' : '#F5F5F5',
          border: `2px solid ${isListening ? '#4CAF50' : '#999'}`,
          borderRadius: 4,
          textAlign: 'center',
          fontWeight: 'bold',
        }}
      >
        🎙️ {isListening ? 'Listening...' : 'Not listening'}
      </div>
    </section>
  )
}
