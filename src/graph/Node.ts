// Node class placeholder for irayna visual editor.
export class Node {
  id: string;
  type: string;
  inputs: any[] = [];
  outputs: any[] = [];
  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
  }
}
