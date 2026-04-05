import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TEXT, ACCENT_PINK } from '../../palette';

// ─── Public Interface ─────────────────────────────────────────

export interface TypingTextProps {
  /** The text to type out */
  text: string;
  /** Frame at which typing begins (relative to parent Sequence). Default 0. */
  startFrame?: number;
  /** Characters revealed per frame. Default 0.5 (2 frames per char). */
  charsPerFrame?: number;
  /** Whether to show a blinking cursor. Default true. */
  showCursor?: boolean;
  /** Character used for the cursor. Default '|'. */
  cursorChar?: string;
  /** Blink cycle length in frames. Default 15. */
  cursorBlinkFrames?: number;
  /** Text color. Default TEXT from palette. */
  color?: string;
  /** Font size in px. Default 48. */
  fontSize?: number;
  /** Font weight. Default 700. */
  fontWeight?: number;
  /** Font family. Default 'Montserrat, sans-serif'. */
  fontFamily?: string;
  /** Cursor color. Default ACCENT_PINK from palette. */
  cursorColor?: string;
}

// ─── Component ────────────────────────────────────────────────

/**
 * TypingText — L3 Motion Primitive
 *
 * Typewriter effect — text appears character by character with a blinking cursor.
 * The cursor blinks while typing and disappears shortly after all text is revealed.
 *
 * Usage:
 *   <TypingText text="Hello, world!" startFrame={10} charsPerFrame={0.8} />
 */
export const TypingText: React.FC<TypingTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.5,
  showCursor = true,
  cursorChar = '|',
  cursorBlinkFrames = 15,
  color = TEXT,
  fontSize = 48,
  fontWeight = 700,
  fontFamily = 'Montserrat, sans-serif',
  cursorColor = ACCENT_PINK,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - startFrame);

  // Calculate how many characters should be visible
  const rawChars = Math.floor(adjustedFrame * charsPerFrame);
  const visibleChars = Math.min(Math.max(rawChars, 0), text.length);
  const visibleText = text.slice(0, visibleChars);
  const allRevealed = visibleChars >= text.length;

  // Cursor logic:
  // - Blinks during typing
  // - After all text is revealed, hold for 1 blink cycle then disappear
  const holdFrames = cursorBlinkFrames; // hold cursor one cycle after done
  const framesAfterDone = allRevealed
    ? adjustedFrame - Math.ceil(text.length / charsPerFrame)
    : 0;
  const cursorGone = allRevealed && framesAfterDone > holdFrames;

  const blinkOn =
    (frame % cursorBlinkFrames) < (cursorBlinkFrames / 2);
  const showCursorNow = showCursor && !cursorGone && blinkOn;

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        color,
        lineHeight: 1.2,
        whiteSpace: 'pre-wrap',
        display: 'inline',
      }}
    >
      {visibleText}
      {showCursorNow && (
        <span style={{ color: cursorColor }}>{cursorChar}</span>
      )}
    </div>
  );
};
