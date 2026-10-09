export function PlayerName({
  nickname,
  code,
  own = false,
}: {
  nickname: string;
  code?: string;
  own?: boolean;
}) {
  const fullName =
    nickname + (code ? ' (' + code + ')' : '') + (own ? ' (bạn)' : '');
  return (
    <span className="player-name" title={fullName}>
      <span className="player-nickname">{nickname}</span>
      {code && <span className="player-name-tag">({code})</span>}
      {own && <span className="player-name-tag">(bạn)</span>}
    </span>
  );
}
