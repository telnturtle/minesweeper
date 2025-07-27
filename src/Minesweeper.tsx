import { css } from '@emotion/react'
import { clsx } from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'

export function Minesweeper() {
  const { isSafe, isInMap, isDoubleSafe } = Minesweeper.c
  const touchTimer = useRef<number | null>(null)
  const [width, setWidth] = useState(15)
  const [height, setHeight] = useState(25)
  const [bombRate, setBombRate] = useState(20)
  const [gameNotStarted, setGameNotStarted] = useState<boolean>(true)
  const initialCoordinate = useRef<[number, number] | null>(null)
  const [map, setMap] = useState<boolean[][]>([])
  const [coveredMap, setCoveredMap] = useState<boolean[][]>([])
  const [flagMap, setFlagMap] = useState<boolean[][]>([])

  const totalMines: number = map.flat().filter(Boolean).length
  const totalFlags: number = flagMap.flat().filter(Boolean).length
  const remainMines: number = totalMines - totalFlags
  const totalCovereds: number = coveredMap.flat().filter(Boolean).length

  const handleClickUncover = useCallback(
    (rowIndex: number, cellIndex: number) => {
      if (coveredMap[rowIndex][cellIndex] && isSafe(map, rowIndex, cellIndex)) {
        /** coordinatesToOpen 에 들어있는 좌표들은 열린다. 첫 좌표를 넣어둔다. */
        const coordinatesToOpen = [[rowIndex, cellIndex]]
        /** coordinatesToOpenSet 는 coordinatesToOpen 에 중복된 좌표가 들어가는 것을 방지한다. */
        const coordinatesToOpenSet = new Set<string>([`${rowIndex},${cellIndex}`])
        /** BFS 를 사용해 재귀적으로 탐색한다. 만약 double safe 한 좌표라면 첫 좌표를 넣어둔다. */
        const coordinatesToBfs = isDoubleSafe(map, rowIndex, cellIndex)
          ? [[rowIndex, cellIndex]]
          : []
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
    },
    [coveredMap, isDoubleSafe, isInMap, isSafe, map]
  )

  useEffect(() => {
    if (gameNotStarted) {
      // reset 버튼을 누르면 첫 클릭 좌표를 초기화한다.
      initialCoordinate.current = null
    } else {
      // 첫 클릭되었다. 게임이 시작됨.
      if (initialCoordinate.current) {
        handleClickUncover(initialCoordinate.current[0], initialCoordinate.current[1])
      }
    }
  }, [gameNotStarted, handleClickUncover])

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
          bomb probability (%):
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
            setMap(MakeMap(width, height, bombRate / 100, []))
            setCoveredMap(MakeCoveredMap(width, height))
            setFlagMap(MakeFlagMap(width, height))
            setGameNotStarted(true)
          }}
        >
          {/* Reset 버튼은 게임 시작 전 상태로 만든다 */}
          Reset
        </button>
      </div>
      <div>
        {gameNotStarted
          ? `${0} 💣 / ${0} 🚩 / ${0} 🔎`
          : `${totalMines} 💣 / ${totalFlags} 🚩 / ${totalMines - totalFlags} 🔎`}
      </div>
      <div>
        {map.map((row, rowIndex) => (
          <div
            key={rowIndex}
            css={css`
              display: flex;
              /* 전체 drag 방지 */
              user-select: none;
            `}
          >
            {row.map((cell, cellIndex) => (
              <button
                key={cellIndex}
                onClick={() => {
                  if (gameNotStarted) {
                    // 첫 클릭 시 map 생성
                    // safe coordinates: self, 8-neighbors
                    setMap(
                      MakeMap(width, height, bombRate / 100, [
                        [rowIndex, cellIndex],
                        ...Minesweeper.c.directions
                          .map(
                            ([dx, dy]) =>
                              [rowIndex + dx, cellIndex + dy] as [number, number]
                          )
                          .filter(([x, y]) => Minesweeper.c.isInMap(map, x, y)),
                      ])
                    )
                    setGameNotStarted(false)
                    initialCoordinate.current = [rowIndex, cellIndex]
                  } else {
                    // 첫 클릭이 아닌 게임 중 클릭
                    handleClickUncover(rowIndex, cellIndex)
                  }
                }}
                css={css`
                  width: 25px;
                  height: 25px;
                  border: none;
                  outline: 1px solid rgba(0 0 0 / 0.25);
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
                contextMenu="none"
                // 우클릭 시 flag set
                onContextMenu={(e) => {
                  e.preventDefault()
                  setFlagMap((flagMap) => {
                    return flagMap.map((row, rowI) =>
                      row.map((cell, cellI) =>
                        cellI === cellIndex && rowI === rowIndex ? !cell : cell
                      )
                    )
                  })
                }}
                onTouchStart={() => {
                  touchTimer.current = setTimeout(() => {
                    // 500ms 이상 누르면 깃발
                    setFlagMap((flagMap) => {
                      return flagMap.map((row, rowI) =>
                        row.map((cell, cellI) =>
                          cellI === cellIndex && rowI === rowIndex ? !cell : cell
                        )
                      )
                    })
                  }, 500)
                }}
                onTouchEnd={() => {
                  if (touchTimer.current) {
                    clearTimeout(touchTimer.current)
                  }
                }}
                onTouchCancel={() => {
                  if (touchTimer.current) {
                    clearTimeout(touchTimer.current)
                  }
                }}
              >
                {coveredMap[rowIndex][cellIndex]
                  ? flagMap[rowIndex][cellIndex]
                    ? '🚩'
                    : ' '
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
  ] as [number, number][],
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

/** safeCoordinates 에 있는 좌표는 모두 false 로 만든다. (안전) */
function MakeMap(
  width: number,
  height: number,
  bombRate: number,
  safeCoordinates: [number, number][]
): boolean[][] {
  return Array.from({ length: height }, (_, rowIndex) =>
    Array.from({ length: width }, (_, cellIndex) => {
      return safeCoordinates.some(([x, y]) => x === rowIndex && y === cellIndex)
        ? false
        : Math.random() < bombRate
    })
  )
}
function MakeCoveredMap(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => true))
}
function MakeFlagMap(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => false))
}

// '💣'
// '🌱'
// '🚩'
