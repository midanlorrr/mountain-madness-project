import Webcam from 'react-webcam'

export function PoseVisualization({ webcamRef, canvasRef, posture }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Posture Analysis</h2>

      {/* Video + Pose Overlay */}
      <div
        style={{
          position: 'relative',
          width: 480,
          height: 360,
          margin: '16px 0',
          border: '2px solid #ccc',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Webcam
          ref={webcamRef}
          width={480}
          height={360}
          videoConstraints={{ facingMode: 'user' }}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>

      {/* Posture Feedback */}
      <div
        style={{
          padding: 16,
          backgroundColor: posture.warning.includes('Good') ? '#E8F5E9' : '#FFF3E0',
          border: `2px solid ${posture.warning.includes('Good') ? '#4CAF50' : '#FF9800'}`,
          borderRadius: 8,
          fontSize: 18,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {posture.warning}
      </div>

      {/* Metrics */}
      <div style={{ fontSize: 14, color: '#666', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 12, backgroundColor: '#F5F5F5', borderRadius: 4 }}>
          <strong>Shoulder Difference</strong>
          <p style={{ margin: '8px 0 0', fontSize: 16 }}>{posture.shoulderSlope.toFixed(1)}px</p>
        </div>
        <div style={{ padding: 12, backgroundColor: '#F5F5F5', borderRadius: 4 }}>
          <strong>Head Forward</strong>
          <p style={{ margin: '8px 0 0', fontSize: 16 }}>{posture.headTilt.toFixed(1)}px</p>
        </div>
      </div>
    </section>
  )
}
