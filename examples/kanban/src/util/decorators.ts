import { invalidate, type Renderable } from 'dhtml'

export function state<This extends Renderable, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
): ClassAccessorDecoratorResult<This, Value> {
  return {
    set(value) {
      target.set.call(this, value)
      invalidate(this)
    },
  }
}
