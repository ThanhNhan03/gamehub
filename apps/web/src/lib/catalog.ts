export const games = [
  {
    id: 'caro',
    name: 'Cờ caro',
    color: 'blue',
    players: '2 người',
    line: 'Một nước đi, cả phòng nín thở.',
    tag: 'Đấu trí nhẹ nhàng',
    phase: 1,
  },
  {
    id: 'telephone',
    name: 'Tam sao thất bản',
    color: 'pink',
    players: '4–12 người',
    line: 'Vẽ một đằng, đoán một nẻo.',
    tag: 'Cười hết giờ nghỉ',
    phase: 2,
  },
  {
    id: 'ludo',
    name: 'Cờ cá ngựa',
    color: 'orange',
    players: '2–4 người',
    line: 'Đồng nghiệp ơi, về chuồng nhé!',
    tag: 'Vui là chính, đá là mười',
    phase: 3,
  },
  {
    id: 'poker',
    name: 'Poker',
    color: 'green',
    players: '2–8 người',
    line: 'Giữ mặt tỉnh, chơi hết mình.',
    tag: 'Texas Hold’em · chip ảo',
    phase: 4,
  },
] as const;
export type GameId = (typeof games)[number]['id'];
export const avatarColors = [
  '#9B7BFF',
  '#FF6FA8',
  '#4CC2FF',
  '#5BD98B',
  '#FF9A3C',
  '#FFD84D',
  '#FF4F8B',
  '#FFF4CC',
];
