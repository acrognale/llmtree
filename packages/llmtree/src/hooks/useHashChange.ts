import { useEffect, useState } from 'react'
import { useReactFlow, Node } from 'reactflow'

interface UseHashChangeProps {
  nodes: Node[]
}

export function useHashChange({ nodes }: UseHashChangeProps) {
  // track if the user has panned since the page loaded
  const [prevHash, setPrevHash] = useState<string | null>(null)
  const { setCenter, getZoom } = useReactFlow()

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== prevHash) {
        setPrevHash(window.location.hash)
        const nodeId = window.location.hash.slice(1)
        if (nodeId) {
          const node = nodes.find((n) => n.id === nodeId)
          if (node) {
            setCenter(
              node.position.x + node.width! / 2,
              node.position.y + node.height! / 2,
              {
                duration: 1000,
                zoom: getZoom(),
              }
            )
          }
        }
      }
    }

    // Add the event listener for hash changes
    window.addEventListener('hashchange', handleHashChange)

    // Call handleHashChange once on mount to handle initial URL
    handleHashChange()

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [nodes, setCenter, getZoom, prevHash]) // Include necessary dependencies
}
