package Protocol.Message;

public enum MessageType {
    PUTCHUNK("PUTCHUNK", "1.0"),
    STORED("STORED", "1.0"),

    GETCHUNK("GETCHUNK", "1.0"),
    CHUNK("CHUNK", "1.0"),

    DELETE("DELETE", "1.0"),
    REMOVED("REMOVED", "1.0");

    private final String text;
    private final String version;
    MessageType(final String text, final String version) {
        this.text = text;
        this.version = version;
    }

    @Override
    public String toString() {
        return text;
    }
    public String version() {
        return version;
    }
}
