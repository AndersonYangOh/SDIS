package Service;

import Protocol.Chunk.Chunk;

import java.io.*;
import java.util.ArrayList;

public class Database {
    private static final int MAX_CHUNKS = 1500;
    private static ArrayList<Chunk> chunks = new ArrayList<>();

    public static void loadDatabase() {
        try {
            FileInputStream fileInputStream = new FileInputStream(FileSystem.getDatabasePathName("chunks.db"));
            ObjectInputStream objectInputStream = new ObjectInputStream(fileInputStream);
            chunks = (ArrayList<Chunk>) objectInputStream.readObject();
            objectInputStream.close();
        } catch (FileNotFoundException e) {
            //e.printStackTrace();
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static void saveDatabase() {
        try {
            FileOutputStream fileOutputStream = new FileOutputStream(FileSystem.getDatabasePathName("chunks.db"));
            ObjectOutputStream objectOutputStream = new ObjectOutputStream( fileOutputStream);
            objectOutputStream.writeObject(chunks);
            objectOutputStream.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static boolean addChunk(Chunk chunk) {
        if (!chunks.contains(chunk)) {
            chunks.add(chunk);
            saveDatabase();
            return true;
        }
        return false;
    }

    public static boolean removeChunk(Chunk chunk) {
        boolean removed = chunks.removeIf(c2 -> {
            if (c2.equals(chunk)) return true;
            return false;
        });
        if (removed) saveDatabase();
        return removed;
    }

    public static boolean deleteFile(String fileID) {
        boolean removed = chunks.removeIf(c2 -> {
            if (c2.fileID.equals(fileID)) return true;
            return false;
        });
        if (removed) saveDatabase();
        return removed;
    }

    public static void clear() {
        chunks.clear();
        saveDatabase();
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

    public static Chunk getChunk(Chunk chunk) throws IllegalArgumentException{
        int i = chunks.indexOf(chunk);
        if (i != -1) return chunks.get(i);
        throw new IllegalArgumentException();
    }

    public static ArrayList<Chunk> getChunks() {
        return chunks;
    }

    public static int numChunks() {
        return chunks.size();
    }
}
