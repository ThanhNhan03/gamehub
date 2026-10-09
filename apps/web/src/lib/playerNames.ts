import type { RoomView } from '@gamehub/shared';

const normalize = (name: string) =>
  name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

export function createPlayerLabels(
  room: Pick<RoomView, 'players' | 'spectators' | 'chat'>,
) {
  const people = [
    ...room.players,
    ...room.spectators,
    ...room.chat.map((message) => ({
      id: message.playerId,
      nickname: message.nickname,
    })),
  ];
  const groups = new Map<string, Set<string>>();
  for (const person of people) {
    const key = normalize(person.nickname);
    const group = groups.get(key) ?? new Set<string>();
    group.add(person.id);
    groups.set(key, group);
  }
  const numbers = new Map(
    [...groups].map(([name, ids]) => [
      name,
      new Map([...ids].sort().map((id, index) => [id, String(index + 1)])),
    ]),
  );
  const codeFor = (id: string, nickname: string) => {
    const group = numbers.get(normalize(nickname));
    return group && group.size > 1 ? group.get(id) : undefined;
  };
  const nameFor = (id: string, nickname: string) => {
    const code = codeFor(id, nickname);
    return nickname + (code ? ' (' + code + ')' : '');
  };
  return { codeFor, nameFor };
}
