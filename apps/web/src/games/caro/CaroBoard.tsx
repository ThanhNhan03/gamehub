import { useRef, useState } from 'react';
import { CARO_SIZE, type CaroView } from '@gamehub/shared';
import { Button } from '../../components/UI';
export function CaroBoard({
  game,
  canPlay,
  pending,
  onPlace,
}: {
  game: CaroView;
  canPlay: boolean;
  pending: boolean;
  onPlace: (row: number, col: number) => void;
}) {
  const [focusIndex, setFocusIndex] = useState(112);
  const [zoom, setZoom] = useState(false);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <section className="board-panel" aria-label="Bàn Cờ caro">
      <div className="board-toolbar">
        <span>15 × 15 · Nối 5 quân để thắng</span>
        <Button
          color="cream"
          onClick={() => setZoom(!zoom)}
          aria-pressed={zoom}
        >
          {zoom ? 'Thu nhỏ' : 'Phóng to'}
        </Button>
      </div>
      <div className={`board-scroller ${zoom ? 'is-zoomed' : ''}`}>
        <div
          className={`caro-board panel ${zoom ? 'zoomed' : ''}`}
          role="grid"
          aria-label="Bàn Cờ caro 15 hàng 15 cột"
          aria-rowcount={15}
          aria-colcount={15}
          aria-busy={pending}
        >
          {Array.from({ length: CARO_SIZE }, (_, row) => (
            <div className="caro-row" role="row" key={row}>
              {Array.from({ length: CARO_SIZE }, (_, col) => {
                const index = row * CARO_SIZE + col;
                const mark = game.board[index];
                const winning = game.winningLine.includes(index);
                const last = game.lastMove === index;
                return (
                  <button
                    key={col}
                    ref={(element) => {
                      cells.current[index] = element;
                    }}
                    role="gridcell"
                    aria-rowindex={row + 1}
                    aria-colindex={col + 1}
                    tabIndex={focusIndex === index ? 0 : -1}
                    aria-disabled={!canPlay || !!mark || pending}
                    aria-label={`Hàng ${row + 1}, cột ${col + 1}: ${mark ?? 'trống'}${last ? ', nước vừa đi' : ''}${winning ? ', hàng chiến thắng' : ''}`}
                    className={`caro-cell ${last ? 'last-move' : ''} ${winning ? 'winning-cell' : ''}`}
                    onFocus={() => setFocusIndex(index)}
                    onClick={() => {
                      if (canPlay && !mark && !pending) onPlace(row, col);
                    }}
                    onKeyDown={(event) => {
                      let next = index;
                      if (event.key === 'ArrowRight')
                        next = row * CARO_SIZE + Math.min(col + 1, 14);
                      else if (event.key === 'ArrowLeft')
                        next = row * CARO_SIZE + Math.max(col - 1, 0);
                      else if (event.key === 'ArrowDown')
                        next = Math.min(row + 1, 14) * CARO_SIZE + col;
                      else if (event.key === 'ArrowUp')
                        next = Math.max(row - 1, 0) * CARO_SIZE + col;
                      else if (event.key === 'Home') next = row * CARO_SIZE;
                      else if (event.key === 'End') next = row * CARO_SIZE + 14;
                      else return;
                      event.preventDefault();
                      setFocusIndex(next);
                      cells.current[next]?.focus();
                    }}
                  >
                    {mark && (
                      <svg
                        className={`stone stone-${mark}`}
                        viewBox="0 0 32 32"
                        aria-hidden="true"
                      >
                        {mark === 'X' ? (
                          <>
                            <path
                              d="m7 7 18 18M25 7 7 25"
                              stroke="#2A1B4A"
                              strokeWidth="8"
                              strokeLinecap="round"
                            />
                            <path
                              d="m7 7 18 18M25 7 7 25"
                              stroke="#FF4F8B"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          </>
                        ) : (
                          <>
                            <circle
                              cx="16"
                              cy="16"
                              r="11"
                              fill="#4CC2FF"
                              stroke="#2A1B4A"
                              strokeWidth="3"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="5"
                              fill="#FFF4CC"
                              stroke="#2A1B4A"
                              strokeWidth="2"
                            />
                          </>
                        )}
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="board-help">
        Dùng phím mũi tên để chọn ô, Enter để đánh. Phóng to để dễ bấm trên điện
        thoại.
      </p>
    </section>
  );
}
