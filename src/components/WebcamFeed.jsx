import Webcam from 'react-webcam'

export default function WebcamFeed({ webcamRef }) {
  return (
    <div style={{ 
      border: '2px solid #ddd', 
      borderRadius: 8, 
      overflow: 'hidden',
      backgroundColor: '#000'
    }}>
      <Webcam
        ref={webcamRef}
        width={480}
        height={360}
        videoConstraints={{ facingMode: 'user' }}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </div>
  )
}
