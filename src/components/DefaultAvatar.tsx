export default function DefaultAvatar({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" fill="#0A0A0A" />
      {/* Checkered flag — 4×4 grid centered */}
      {[0,1,2,3].map(row =>
        [0,1,2,3].map(col => {
          const isWhite = (row + col) % 2 === 0
          if (!isWhite) return null
          return (
            <rect
              key={`${row}-${col}`}
              x={24 + col * 8}
              y={24 + row * 8}
              width={8}
              height={8}
              fill="#FFFFFF"
            />
          )
        })
      )}
    </svg>
  )
}
