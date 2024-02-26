interface Closeable {
  close(): Promise<void>;
}

export default Closeable;
