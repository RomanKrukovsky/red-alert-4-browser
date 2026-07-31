# Replay System Specification

## Overview
Replays are stored as lightweight `.ra4replay` JSON files capturing initial seed, player configurations, content hash, and frame-by-frame player commands.

## Playback Engine
Because `packages/sim-core` is 100% deterministic, passing recorded commands into a fresh `GameSimulation` instance reproduces the exact gameplay trajectory tick-for-tick with 0 desynchronization.
