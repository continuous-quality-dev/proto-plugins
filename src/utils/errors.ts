/**
 * Error handling utilities
 */

export class ProtoPluginError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "ProtoPluginError";
	}
}

export class GitHubError extends ProtoPluginError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "GITHUB_ERROR", details);
		this.name = "GitHubError";
	}
}

export class ValidationError extends ProtoPluginError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "VALIDATION_ERROR", details);
		this.name = "ValidationError";
	}
}

export class ProtoError extends ProtoPluginError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "PROTO_ERROR", details);
		this.name = "ProtoError";
	}
}

export class FileSystemError extends ProtoPluginError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "FILESYSTEM_ERROR", details);
		this.name = "FileSystemError";
	}
}

export function handleError(error: unknown): never {
	if (error instanceof ProtoPluginError) {
		console.error(`❌ ${error.name}: ${error.message}`);
		if (error.details) {
			console.error("Details:", error.details);
		}
		process.exit(1);
	}

	if (error instanceof Error) {
		console.error(`❌ Unexpected error: ${error.message}`);
		console.error(error.stack);
		process.exit(1);
	}

	console.error("❌ Unknown error occurred:", error);
	process.exit(1);
}

export function wrapAsync<T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		try {
			return await fn(...args);
		} catch (error) {
			handleError(error);
		}
	};
}
