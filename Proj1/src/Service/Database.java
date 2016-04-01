package Service;

import Protocol.Chunk.Chunk;

import java.util.ArrayList;
import java.util.function.Predicate;

public class Database {
    private static final int MAX_SIZE = 1500;
    private static ArrayList<Chunk> chunks = new ArrayList<>();

    public static boolean addChunk(Chunk chunk) {
        if (!chunks.contains(chunk)) {
            chunks.add(chunk);
            return true;
        }
        return false;
    }

    public static boolean removeChunk(Chunk chunk) {
        return chunks.removeIf(c2 -> {
            if (c2.equals(chunk)) return true;
            return false;
        });
    }

    public static boolean deleteFile(String fileID) {
        return chunks.removeIf(c2 -> {
            if (c2.fileID.equals(fileID)) return true;
            return false;
        });
    }

    public static int getChunkReplDeg(Chunk chunk) {
        Chunk c = getChunk(chunk);
        return c.replDeg;
    }

    public static int getChunkRealReplDeg(Chunk chunk) {
        Chunk c = getChunk(chunk);
        return c.getRealReplDeg();
    }

    public static boolean hasChunk(Chunk chunk) {
        try {
            getChunk(chunk);
            return true;
        }
        catch (IllegalArgumentException e) { return false; }
    }

    public static Chunk getChunk(Chunk chunk) {
        int i = chunks.indexOf(chunk);
        if (i != -1) return chunks.get(i);
        throw new IllegalArgumentException();
    }

    public static int numChunks() {
        return chunks.size();
    }
}
