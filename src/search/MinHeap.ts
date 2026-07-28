/** Binary min-heap over (id, key) pairs. */
export class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  push(id: number, key: number): void {
    this.ids.push(id);
    this.keys.push(key);

    let i = this.ids.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): [number, number] | null {
    if (!this.ids.length) return null;
    const top: [number, number] = [this.ids[0], this.keys[0]];

    const id = this.ids.pop()!;
    const key = this.keys.pop()!;

    if (this.ids.length) {
      this.ids[0] = id;
      this.keys[0] = key;
      this.sink(0);
    }
    return top;
  }

  private sink(start: number): void {
    let i = start;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.ids.length && this.keys[left] < this.keys[smallest])
        smallest = left;
      if (right < this.ids.length && this.keys[right] < this.keys[smallest])
        smallest = right;
      if (smallest === i) return;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}
