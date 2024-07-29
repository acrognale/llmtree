type Position = {
  x: number
  y: number
}

type Node = {
  id: string
  position: Position
  width: number
  height: number
}

type Edge = {
  source: string
  target: string
}

export function getRandomPosition(
  nodes: Node[],
  edges: Edge[],
  parentId: string,
  newNodeWidth: number,
  newNodeHeight: number,
  padding: number,
  direction: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  maxAttempts = 10
): Position {
  const parentNode = nodes.find((node) => node.id === parentId)
  if (!parentNode) {
    throw new Error(`Parent node with ID ${parentId} not found.`)
  }

  // pick a random angle between pi/2 and 3pi/2
  const angle = Math.PI / 2 + Math.random() * ((3 * Math.PI) / 2 - Math.PI / 2)
  const distance = parentNode.width / 2 + newNodeWidth / 2 + padding
  const x =
    parentNode.position.x - Math.cos(angle) * distance + parentNode.width / 2
  const y =
    parentNode.position.y - Math.sin(angle) * distance + parentNode.height / 2

  // check for collisions along all nodes and edges that overlap with the raycast path
  const isCollidingWithNodes = isColliding(
    { x, y },
    newNodeWidth,
    newNodeHeight,
    nodes,
    padding
  )

  if (isCollidingWithNodes && maxAttempts > 0) {
    maxAttempts -= 1
    return getRandomPosition(
      nodes,
      edges,
      parentId,
      newNodeWidth,
      newNodeHeight,
      padding,
      direction,
      maxAttempts
    )
  }

  return { x, y }
}
// Helper function to check for collisions
function isColliding(
  position: Position,
  width: number,
  height: number,
  nodes: Node[],
  padding: number
): boolean {
  const nodeLeft = position.x
  const nodeRight = position.x + width
  const nodeTop = position.y
  const nodeBottom = position.y + height

  return nodes.some((otherNode) => {
    const otherLeft = otherNode.position.x
    const otherRight = otherNode.position.x + otherNode.width
    const otherTop = otherNode.position.y
    const otherBottom = otherNode.position.y + otherNode.height

    return (
      nodeLeft < otherRight + padding &&
      nodeRight + padding > otherLeft &&
      nodeTop < otherBottom + padding &&
      nodeBottom + padding > otherTop
    )
  })
}
