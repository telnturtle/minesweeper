import { css } from '@emotion/react'
import { clsx } from 'clsx'
import { range } from 'es-toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'

export function Minesweeper() {
  const { isSafe, isInMap, isDoubleSafe } = Minesweeper.c
  const touchTimer = useRef<number | null>(null)
  const [width, setWidth] = useState(15)
  const [height, setHeight] = useState(25)
  const [bombRate, setBombRate] = useState(20)
  const [gameStatus, setGameStatus] = useState<'ready' | 'playing' | 'won' | 'lost'>(
    'ready'
  )
  const initialCoordinate = useRef<[number, number] | null>(null)
  // map: true cell 은 폭탄, false cell 은 안전
  const [map, setMap] = useState<boolean[][]>([])
  const [coveredMap, setCoveredMap] = useState<boolean[][]>([])
  const [flagMap, setFlagMap] = useState<boolean[][]>([])

  const totalMines: number = map.flat().filter(Boolean).length
  const totalFlags: number = flagMap.flat().filter(Boolean).length
  const remainMines: number = totalMines - totalFlags
  const totalCovereds: number = coveredMap.flat().filter(Boolean).length

  const [explodedCellSet, setExplodedCellSet] = useState<Set<string>>(new Set())

  const [isLostProcessing, setIsLostProcessing] = useState<boolean>(false)

  const lose = (rowIndex: number, cellIndex: number) => {
    const bombingDuration = 3.5

    setIsLostProcessing(true)
    // 클릭된 셀을 언커버.
    setCoveredMap((coveredMap) => {
      return coveredMap.map((row, rowI) =>
        rowI === rowIndex
          ? row.map((cell, cellI) => (cellI === cellIndex ? false : cell))
          : row
      )
    })
    // 아직 깃발이 꼽히지 않은 폭탄 셀을 모두 구한다.
    const bombCells = range(0, map.length)
      .map((rowI) => range(0, map[0].length).map((cellI) => [rowI, cellI]))
      .flat()
      .filter(([rowI, cellI]) => map[rowI][cellI] && !flagMap[rowI][cellI])

    const bombCellsWithThetas = bombCells.map(([rowI, cellI]) => [
      rowI,
      cellI,
      Math.atan2(cellI - cellIndex, rowI - rowIndex),
    ])

    bombCellsWithThetas.sort((a, b) => {
      if (a[0] === rowIndex && a[1] === cellIndex) {
        return -1
      }
      if (a[2] < b[2]) {
        return -1
      }
      if (a[2] > b[2]) {
        return 1
      }
      return 0
    })

    range(-50, 50, 1)
      .map((item) => item / 10)
      .forEach((i, index) => {
        window.setTimeout(() => {
          bombCellsWithThetas.forEach(([rowI, cellI, theta]) => {
            if (theta < i) {
              setExplodedCellSet((explodedCellSet) => {
                return new Set([...explodedCellSet, `${rowI},${cellI}`])
              })
            }
          })
        }, index * (bombingDuration / ((4 - -4) / 0.1)) * 1000)
      })

    // 폭발 완료 후 게임 종료
    window.setTimeout(() => {
      setIsLostProcessing(false)
      setGameStatus('lost')
    }, (bombingDuration + 1) * 1000)
  }

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
    if (gameStatus === 'playing') {
      if (remainMines === 0) {
        setGameStatus('won')
      }
    }
  }, [gameStatus, remainMines])

  useEffect(() => {
    const isGameReady = gameStatus === 'ready'
    if (isGameReady) {
      // reset 버튼을 누르면 첫 클릭 좌표를 초기화한다.
      initialCoordinate.current = null
    } else {
      // 첫 클릭되었다. 게임이 시작됨.
      if (initialCoordinate.current) {
        handleClickUncover(initialCoordinate.current[0], initialCoordinate.current[1])
      }
    }
  }, [gameStatus, handleClickUncover])

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
            setGameStatus('ready')
            setExplodedCellSet(new Set())
          }}
        >
          {/* Reset 버튼은 게임 시작 전 상태로 만든다 */}
          Reset
        </button>
      </div>
      <div>
        {gameStatus === 'ready'
          ? `${0} 💣 / ${0} 🚩 / ${0} 🔎`
          : `${totalMines} 💣 / ${totalFlags} 🚩 / ${totalMines - totalFlags} 🔎`}
      </div>
      <div
        css={css`
          &.disabled {
            pointer-events: none;
          }
        `}
        className={clsx({
          disabled: isLostProcessing,
        })}
      >
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
                  if (gameStatus === 'ready') {
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
                    setGameStatus('playing')
                    initialCoordinate.current = [rowIndex, cellIndex]
                  } else if (gameStatus === 'playing') {
                    // 첫 클릭이 아닌 게임 중 클릭
                    if (isSafe(map, rowIndex, cellIndex)) {
                      // 클릭된 셀이 안전함
                      handleClickUncover(rowIndex, cellIndex)
                    } else {
                      // 클릭된 셀이 폭탄임
                      lose(rowIndex, cellIndex)
                    }
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
                disabled={['won', 'lost'].includes(gameStatus)}
              >
                {(() => {
                  const isExploded = explodedCellSet.has(`${rowIndex},${cellIndex}`)
                  const isCovered = coveredMap[rowIndex][cellIndex]
                  if (isExploded) {
                    return isCovered ? '💣' : '💥'
                  }
                  if (isCovered) {
                    const isFlagged = flagMap[rowIndex][cellIndex]
                    return isFlagged ? '🚩' : ' '
                  }
                  const isBomb = cell
                  if (isBomb) {
                    return '💥'
                  }
                  if (isDoubleSafe(map, rowIndex, cellIndex)) {
                    return ' '
                  }
                  return Minesweeper.c.getBombNeighbors(map, rowIndex, cellIndex).length
                })()}
              </button>
            ))}
          </div>
        ))}
      </div>
      {gameStatus}
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
