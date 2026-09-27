/** A confirmation only authorizes replacing the specific track the user saw. */
export function needsLoadConfirmation(
  playing: boolean,
  mediaPlaying: boolean,
  currentTrackId: string,
  confirmedTrackId?: string,
): boolean {
  return (playing || mediaPlaying) && confirmedTrackId !== currentTrackId;
}
