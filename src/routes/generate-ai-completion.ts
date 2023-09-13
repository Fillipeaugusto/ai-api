import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { createReadStream } from 'node:fs';
import { openai } from '../lib/openai';

export async function generateAICompletionRoute(app: FastifyInstance) {
	app.post('/ai/complete', async (request, reply) => {
		const bodySchema = z.object({
			template: z.string(),
			videoID: z.string().uuid(),
			temperature: z.number().min(0).max(1).default(0),
		});

		const { template, videoID, temperature } = bodySchema.parse(request.body);

		const video = await prisma.video.findFirstOrThrow({
			where: {
				id: videoID,
			},
		});

		if (!video.transcription) {
			return reply.status(400).send({
				error: 'Transcription not found',
			});
		}

		const promptMessage = template.replace(
			'{transcription}',
			video.transcription
		);

		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo-16k',
			temperature,
			messages: [
				{
					role: 'user',
					content: promptMessage,
				},
			],
		});

		return {
			response,
		};
	});
}