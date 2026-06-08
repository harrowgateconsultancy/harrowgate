import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAdminToken } from "../routes/adminAuth";

export function setupScreenMirror(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
    maxHttpBufferSize: 8e6,
  });

  io.on("connection", (socket) => {
    const auth = socket.handshake.auth as { role?: string; token?: string; submissionId?: number };

    if (auth.role === "admin") {
      if (!verifyAdminToken(auth.token)) { socket.disconnect(true); return; }

      socket.data.watchingIds = [] as number[];

      socket.on("watch:start", (submissionId: number) => {
        socket.join(`admin:${submissionId}`);
        socket.data.watchingIds = [...socket.data.watchingIds, submissionId];
        io.to(`student:${submissionId}`).emit("watch:start");
      });

      socket.on("watch:stop", (submissionId: number) => {
        socket.leave(`admin:${submissionId}`);
        socket.data.watchingIds = (socket.data.watchingIds as number[]).filter((id: number) => id !== submissionId);
        const room = io.sockets.adapter.rooms.get(`admin:${submissionId}`);
        if (!room || room.size === 0) {
          io.to(`student:${submissionId}`).emit("watch:stop");
        }
      });

      socket.on("disconnect", () => {
        for (const sid of (socket.data.watchingIds as number[]) ?? []) {
          const room = io.sockets.adapter.rooms.get(`admin:${sid}`);
          if (!room || room.size === 0) {
            io.to(`student:${sid}`).emit("watch:stop");
          }
        }
      });

    } else if (auth.role === "student" && auth.submissionId) {
      const submissionId = Number(auth.submissionId);
      socket.join(`student:${submissionId}`);

      socket.on("student:frame", (frame: string) => {
        socket.to(`admin:${submissionId}`).emit("frame", frame);
      });

      socket.on("disconnect", () => {
        io.to(`admin:${submissionId}`).emit("student:offline");
      });
    } else {
      socket.disconnect(true);
    }
  });

  return io;
}
