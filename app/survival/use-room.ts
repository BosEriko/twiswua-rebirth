"use client";

import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  goOffline,
  goOnline,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
} from "firebase/database";
import { getFirebase } from "../../lib/firebase";
import {
  createSession,
  emptyInput,
  normalizeSession,
  roomCode,
  serializeSession,
  stepSession,
  validRoomCode,
  type Room,
  type Session,
} from "../../lib/survival-room";

export function useRoom() {
  const [firebase] = useState(getFirebase);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const session = useRef<Session | null>(null);
  const input = useRef(emptyInput());
  const roomRef = useRef<Room | null>(null);
  const cleanupPresence = useRef<(() => Promise<void>) | null>(null);
  const host = !!user && room?.host === user.uid;

  function report(cause: unknown) {
    setError(
      cause instanceof Error
        ? cause.message
        : "Unable to connect. Please try again.",
    );
  }

  useEffect(() => {
    if (!firebase) return;
    const authStop = onAuthStateChanged(
      firebase.auth,
      (value) => {
        setUser(value);
        setAuthReady(true);
        if (value) goOnline(firebase.database);
        if (!value) {
          if (cleanupPresence.current) goOffline(firebase.database);
          setCode("");
          setRoom(null);
          session.current = null;
        }
      },
      report,
    );
    const connectionStop = onValue(
      ref(firebase.database, ".info/connected"),
      (snapshot) => setConnected(snapshot.val() === true),
      report,
    );
    return () => {
      authStop();
      connectionStop();
    };
  }, [firebase]);

  useEffect(() => {
    if (!firebase || !code || !user) return;
    const roomPath = ref(firebase.database, `survival/rooms/${code}`);
    let active = true;
    let inputWriting = false;
    let stateWriting = false;
    let lastInput = "";
    let lastPublish = 0;
    const stop = onValue(
      roomPath,
      (snapshot) => {
        const value = snapshot.val() as Room | null;
        if (!value || !value.members?.[user.uid]) {
          setError(
            "This room has closed or you have left it. Create or join another room.",
          );
          setCode("");
          setRoom(null);
          session.current = null;
          return;
        }
        value.state = normalizeSession(value.state);
        if (
          value.host === user.uid &&
          session.current?.world.phase === "playing"
        ) {
          for (const id of Object.keys(value.members)) {
            if (!session.current.players[id]) {
              const joining = createSession([id]);
              session.current.players[id] = joining.players[id];
              session.current.consumed[id] = {
                dash: value.members[id].input.dash,
                roar: value.members[id].input.roar,
              };
            }
          }
        }
        roomRef.current = value;
        if (value.host !== user.uid || !session.current)
          session.current = value.state;
        setRoom({ ...value, state: session.current });
      },
      (cause) => {
        report(cause);
        setCode("");
        setRoom(null);
        session.current = null;
      },
    );
    const timer = window.setInterval(() => {
      if (!active || !connected) return;
      const current = roomRef.current;
      if (!current) return;
      const serialized = JSON.stringify(input.current);
      if (!inputWriting && serialized !== lastInput) {
        inputWriting = true;
        set(
          ref(
            firebase.database,
            `survival/rooms/${code}/members/${user.uid}/input`,
          ),
          { ...input.current },
        )
          .then(() => {
            lastInput = serialized;
          })
          .catch((cause) => {
            if (active) report(cause);
          })
          .finally(() => {
            inputWriting = false;
          });
      }
      if (current.host !== user.uid || !session.current) return;
      const state = session.current;
      current.members[user.uid].input = { ...input.current };
      if (state.world.phase === "ready") {
        const ids = Object.keys(current.members);
        if (ids.join() !== Object.keys(state.players).join())
          session.current = createSession(ids);
      } else {
        stepSession(state, current.members, 0.05);
      }
      if (stateWriting || performance.now() - lastPublish < 100) return;
      lastPublish = performance.now();
      stateWriting = true;
      const next = session.current!;
      setRoom({ ...current, state: next });
      set(
        ref(firebase.database, `survival/rooms/${code}/state`),
        serializeSession(next),
      )
        .catch((cause) => {
          if (!active) return;
          report(cause);
          setCode("");
          setRoom(null);
          session.current = null;
        })
        .finally(() => {
          stateWriting = false;
        });
    }, 50);
    return () => {
      active = false;
      stop();
      clearInterval(timer);
      roomRef.current = null;
    };
  }, [firebase, code, user, connected]);

  useEffect(
    () => () => {
      void cleanupPresence.current?.().catch(() => {});
    },
    [],
  );

  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (cause) {
      report(cause);
    } finally {
      setBusy(false);
    }
  }

  async function enter(joinCode?: string) {
    if (!firebase || !user || !connected || code) return;
    await action(async () => {
      const nextCode = joinCode?.trim().toUpperCase() || roomCode();
      if (!validRoomCode(nextCode))
        throw new Error("Enter an eight-character room code.");
      const path = `survival/rooms/${nextCode}`;
      const member = {
        name: (user.displayName || "Explorer").slice(0, 40),
        input: emptyInput(),
      };
      const presenceRef = ref(
        firebase.database,
        joinCode ? `${path}/members/${user.uid}` : path,
      );
      const disconnect = onDisconnect(presenceRef);
      if (joinCode) {
        const result = await runTransaction(
          presenceRef,
          (existing) => (existing ? undefined : member),
          { applyLocally: false },
        );
        if (!result.committed)
          throw new Error("You are already in this room on another tab.");
        try {
          await disconnect.remove();
        } catch (cause) {
          await remove(presenceRef);
          throw cause;
        }
      } else {
        const result = await runTransaction(
          presenceRef,
          (existing) =>
            existing
              ? undefined
              : {
                  host: user.uid,
                  createdAt: Date.now(),
                  members: { [user.uid]: member },
                  state: serializeSession(createSession([user.uid])),
                },
          { applyLocally: false },
        );
        if (!result.committed)
          throw new Error("Room code was taken. Please create another room.");
        try {
          await disconnect.remove();
        } catch (cause) {
          await remove(presenceRef);
          throw cause;
        }
      }
      cleanupPresence.current = async () => {
        await remove(presenceRef);
        await disconnect.cancel();
      };
      input.current = emptyInput();
      session.current = null;
      setCode(nextCode);
    });
  }

  async function leave() {
    await action(async () => {
      await cleanupPresence.current?.();
      cleanupPresence.current = null;
      setCode("");
      setRoom(null);
      session.current = null;
    });
  }

  function start() {
    if (
      !host ||
      !room ||
      !session.current ||
      !connected ||
      Object.keys(room.members).length < 2
    )
      return;
    if (
      session.current.world.phase !== "ready" &&
      session.current.world.phase !== "over"
    )
      return;
    const next = createSession(Object.keys(room.members), Date.now());
    next.world.phase = "playing";
    for (const [id, member] of Object.entries(room.members))
      next.consumed[id] = { dash: member.input.dash, roar: member.input.roar };
    session.current = next;
    setRoom({ ...room, state: next });
  }

  return {
    configured: !!firebase,
    authReady,
    user,
    connected,
    code,
    room,
    host,
    error,
    busy,
    input,
    session,
    enter,
    leave,
    start,
    login: () =>
      action(async () => {
        if (firebase)
          await signInWithPopup(firebase.auth, new GoogleAuthProvider());
      }),
    logout: () =>
      action(async () => {
        if (firebase && !code) await signOut(firebase.auth);
      }),
  };
}
