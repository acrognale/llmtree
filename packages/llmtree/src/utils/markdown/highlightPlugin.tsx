import { Node, Parent } from 'unist'
import { SKIP, visit } from 'unist-util-visit'

export const highlightPlugin = () => {
  return (tree: Node) => {
    visit(
      tree,
      'text',
      (node: { value: string }, index: number, parent: Parent) => {
        const matches = node.value.match(/(?<!=)==([^=]+)==(?!=)/g)
        if (matches) {
          const children = []
          let lastIndex = 0
          matches.forEach((match) => {
            const startIndex = node.value.indexOf(match, lastIndex)
            if (startIndex > lastIndex) {
              children.push({
                type: 'text',
                value: node.value.slice(lastIndex, startIndex),
              })
            }
            children.push({
              data: {
                hName: 'mark',
                hProperties: {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  dataEdgeId: parent.url?.slice(1),
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  id: parent.url?.slice(1),
                },
              },
              type: 'element',
              children: [
                {
                  type: 'text',
                  value: match.slice(2, -2),
                },
              ],
            })
            lastIndex = startIndex + match.length
          })
          if (lastIndex < node.value.length) {
            children.push({ type: 'text', value: node.value.slice(lastIndex) })
          }
          parent.children.splice(index, 1, ...children)
          return [SKIP, index]
        }
      }
    )
  }
}
