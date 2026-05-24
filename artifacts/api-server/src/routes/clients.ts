import { Router, type IRouter, type Request, type Response } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody, UpdateClientParams, GetClientParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", async (req: Request, res: Response) => {
  try {
    const clients = await db.select().from(clientsTable).orderBy(clientsTable.createdAt);
    res.json(clients.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      nationality: c.nationality,
      countryOfOrigin: c.countryOfOrigin,
      dateOfBirth: c.dateOfBirth,
      passportNumber: c.passportNumber,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing clients");
    res.status(500).json({ error: "Failed to list clients" });
  }
});

router.post("/clients", async (req: Request, res: Response) => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [client] = await db.insert(clientsTable).values(parsed.data).returning();
    res.status(201).json({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      nationality: client.nationality,
      countryOfOrigin: client.countryOfOrigin,
      dateOfBirth: client.dateOfBirth,
      passportNumber: client.passportNumber,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating client");
    res.status(500).json({ error: "Failed to create client" });
  }
});

router.get("/clients/:clientId", async (req: Request, res: Response) => {
  const parsed = GetClientParams.safeParse({ clientId: Number(req.params.clientId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }
  try {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      nationality: client.nationality,
      countryOfOrigin: client.countryOfOrigin,
      dateOfBirth: client.dateOfBirth,
      passportNumber: client.passportNumber,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching client");
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

router.patch("/clients/:clientId", async (req: Request, res: Response) => {
  const paramsParsed = UpdateClientParams.safeParse({ clientId: Number(req.params.clientId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid client ID" });
    return;
  }
  const bodyParsed = UpdateClientBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [client] = await db.update(clientsTable).set(bodyParsed.data).where(eq(clientsTable.id, paramsParsed.data.clientId)).returning();
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      nationality: client.nationality,
      countryOfOrigin: client.countryOfOrigin,
      dateOfBirth: client.dateOfBirth,
      passportNumber: client.passportNumber,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating client");
    res.status(500).json({ error: "Failed to update client" });
  }
});

export default router;
