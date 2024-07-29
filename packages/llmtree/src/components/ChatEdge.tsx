import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow'
import colors from 'tailwindcss/colors'

export function ChatEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY } = props

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  // remove undefined elements from props.style
  const style = { ...props.style }
  Object.keys(style).forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (style[key] === undefined) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      delete style[key]
    }
  })

  return (
    <BaseEdge
      path={edgePath}
      {...props}
      style={{
        stroke: colors['yellow']['400'],
        strokeWidth: 4,
        ...style,
      }}
    />
  )
}
