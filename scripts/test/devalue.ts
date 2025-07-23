import * as devalue from 'devalue'

export function stringify(value: unknown): string {
	return devalue.stringify(value, {
		Error: value =>
			value instanceof Error && { name: value.name, message: value.message, stack: value.stack, cause: value.cause },
	})
}

export function parse(value: string): unknown {
	return devalue.parse(value, {
		Error: ({ message, ...rest }) => Object.assign(new Error(message), rest),
	})
}
