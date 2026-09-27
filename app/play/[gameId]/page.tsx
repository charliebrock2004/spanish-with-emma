import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GAME_BY_ID, GAMES, type GameId } from '@/components/games/catalog';
import { GameScreen } from '@/components/games/GameScreen';
import { getExercisesOfType, getWordList } from '@/lib/curriculum';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ gameId: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  return { title: GAME_BY_ID.get(gameId as GameId)?.title ?? 'Game' };
}

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = GAME_BY_ID.get(gameId as GameId);
  if (!game) notFound();

  // Word games use the player's own words; lesson games get their exercises from the server.
  if (game.source === 'words') return <GameScreen gameId={game.id} />;
  const exercises = game.source === 'sentences' ? getExercisesOfType('order') : getExercisesOfType('conversation');
  return <GameScreen gameId={game.id} words={getWordList()} exercises={exercises} />;
}
