package Service;

import Protocol.Chunk.Chunk;

import java.util.ArrayList;

public class Database {
    private static ArrayList<Chunk> chunks = new ArrayList<>();

    public static boolean addChunk(Chunk chunk) {
        if (!chunks.contains(chunk)) {
            chunks.add(chunk);
            return true;
        }
        return false;
    }

    public static int getChunkReplDeg(Chunk chunk) {
        Chunk c = getChunk(chunk);
        return c.replDeg;
    }

    public static int getChunkRealReplDeg(Chunk chunk) {
        Chunk c = getChunk(chunk);
        return c.getRealReplDeg();
    }

    public static Chunk getChunk(Chunk chunk) {
        int i = chunks.indexOf(chunk);
        if (i != -1) return chunks.get(i);
        throw new IllegalArgumentException();
    }

    public static int chunkSize() {
        return chunks.size();
    }
}
