import { css } from '@emotion/react'
import { clsx } from 'clsx'
import { useState } from 'react'

export function Minesweeper() {
  const { isSafe, isInMap, isDoubleSafe } = Minesweeper.c
  const [width, setWidth] = useState(15)
  const [height, setHeight] = useState(25)
  const [bombRate, setBombRate] = useState(10)
  const [map, setMap] = useState<boolean[][]>([])
  const [coveredMap, setCoveredMap] = useState<boolean[][]>([])
  const handleClickUncover = (rowIndex: number, cellIndex: number) => {
    if (coveredMap[rowIndex][cellIndex] && isSafe(map, rowIndex, cellIndex)) {
      /** coordinatesToOpen 에 들어있는 좌표들은 열린다. 첫 좌표를 넣어둔다. */
      const coordinatesToOpen = [[rowIndex, cellIndex]]
      /** coordinatesToOpenSet 는 coordinatesToOpen 에 중복된 좌표가 들어가는 것을 방지한다. */
      const coordinatesToOpenSet = new Set<string>([`${rowIndex},${cellIndex}`])
      /** BFS 를 사용해 재귀적으로 탐색한다. 첫 좌표를 넣어둔다. */
      const coordinatesToBfs = [[rowIndex, cellIndex]]
      // BFS
      while (coordinatesToBfs.length > 0) {
        const item = coordinatesToBfs.shift()
        // 타입 에러 방지
        if (!item) break
        const [x, y] = item

        // 8-way uncover
        Minesweeper.c.directions
          .map(([dx, dy]) => [x + dx, y + dy])
          .forEach(([x, y]) => {
            if (
              isInMap(map, x, y) &&
              isSafe(map, x, y) &&
              !coordinatesToOpenSet.has(`${x},${y}`)
            ) {
              // safe 한 좌표는 열린다.
              coordinatesToOpen.push([x, y])
              if (isDoubleSafe(map, x, y)) {
                // double safe 한 좌표는 BFS 추가 탐색 대상이 된다.
                coordinatesToBfs.push([x, y])
              }
              coordinatesToOpenSet.add(`${x},${y}`)
            }
          })
      }
      // 열릴 좌표들을 연다.
      setCoveredMap((coveredMap) => {
        coordinatesToOpen.forEach(([x, y]) => {
          coveredMap = Minesweeper.c.uncover(coveredMap, x, y)
        })
        return coveredMap
      })
    }
  }
  return (
    <>
      <div>
        <label>
          width:
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          height:
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>
        <label>
          bomb rate (%):
          <input
            type="range"
            min={1}
            max={100}
            value={bombRate}
            onChange={(e) => setBombRate(Number(e.target.value))}
          />
          <span>{`${bombRate}%`}</span>
        </label>
        <button
          onClick={() => {
            setMap(MakeMap(width, height, bombRate / 100))
            setCoveredMap(MakeCoveredMap(width, height))
          }}
        >
          set map
        </button>
      </div>
      <div>
        {map.map((row, rowIndex) => (
          <div
            key={rowIndex}
            css={css`
              display: flex;
            `}
          >
            {row.map((cell, cellIndex) => (
              <button
                key={cellIndex}
                onClick={() => {
                  handleClickUncover(rowIndex, cellIndex)
                }}
                css={css`
                  width: 20px;
                  height: 20px;
                  border: none;
                  outline: 0.5px solid rgba(0 0 0 / 0.25);
                  border-radius: 0;
                  background-color: rgb(200 200 200 / 0.4);
                  &.covered {
                    background-color: rgb(200 200 200 / 0.8);
                  }
                  &:hover {
                    filter: brightness(1.1);
                  }
                  &:active {
                    filter: brightness(0.9);
                  }
                  display: inline-flex;
                  justify-content: center;
                  align-items: center;
                `}
                className={clsx({
                  covered: coveredMap[rowIndex][cellIndex],
                  bomb: cell,
                  empty: !cell,
                  doubleSafe: isDoubleSafe(map, rowIndex, cellIndex),
                })}
              >
                {coveredMap[rowIndex][cellIndex]
                  ? ' '
                  : cell
                  ? '💣'
                  : isDoubleSafe(map, rowIndex, cellIndex)
                  ? ' '
                  : Minesweeper.c.getBombNeighbors(map, rowIndex, cellIndex).length}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
Minesweeper.c = {
  uncover: (coveredMap: boolean[][], rowIndex: number, cellIndex: number) => {
    return coveredMap.map((row, rowI) =>
      rowI === rowIndex
        ? row.map((cell, cellI) => (cellI === cellIndex ? false : cell))
        : row
    )
  },
  styles: {},
  directions: [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
  isSafe: (map: boolean[][], rowIndex: number, cellIndex: number) => {
    return !map[rowIndex][cellIndex]
  },
  isInMap: (map: boolean[][], rowIndex: number, cellIndex: number) => {
    return (
      rowIndex >= 0 &&
      rowIndex < map.length &&
      cellIndex >= 0 &&
      cellIndex < map[0].length
    )
  },
  isDoubleSafe: (map: boolean[][], rowIndex: number, cellIndex: number) => {
    return Minesweeper.c.directions.every(([dx, dy]) => {
      const x = rowIndex + dx
      const y = cellIndex + dy
      return !Minesweeper.c.isInMap(map, x, y) || Minesweeper.c.isSafe(map, x, y)
    })
  },
  getBombNeighbors: (map: boolean[][], rowIndex: number, cellIndex: number) => {
    return Minesweeper.c.directions
      .map(([dx, dy]) => [rowIndex + dx, cellIndex + dy])
      .filter(([x, y]) => Minesweeper.c.isInMap(map, x, y) && map[x][y])
  },
}

function MakeMap(width: number, height: number, bombRate: number): boolean[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Math.random() < bombRate)
  )
}
function MakeCoveredMap(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => true))
}

// '💣'
// '🌱'
