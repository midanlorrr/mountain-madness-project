export default function ResultsPanel({ results }) {
  if (!results) return null

  return (
    <section style={{
      padding: 24,
      backgroundColor: '#E8F5E9',
      border: '3px solid #4CAF50',
      borderRadius: 8
    }}>
      <h3 style={{ marginTop: 0, color: '#2E7D32' }}>✨ AI Analysis Results</h3>
      
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          fontSize: 32, 
          fontWeight: 'bold', 
          color: '#1B5E20',
          textAlign: 'center',
          marginBottom: 8
        }}>
          {results.score}/10
        </div>
        <div style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>Overall Score</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Summary:</strong>
        <p style={{ margin: '8px 0' }}>{results.confidenceSummary}</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Speech Tips:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {results.speechTips.map((tip, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
          ))}
        </ul>
      </div>

      <div>
        <strong>Posture Tips:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          {results.postureTips.map((tip, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
