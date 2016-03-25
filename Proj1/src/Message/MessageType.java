package Message;

public enum MessageType {
    PUTCHUNK("PUTCHUNK"),
    STORED("STORED"),

    GETCHUNK("GETCHUNK"),
    CHUNK("CHUNK"),

    DELETE("DELETE"),
    REMOVED("REMOVED");

    private final String text;
    MessageType(final String text) {
        this.text = text;
    }

    @Override
    public String toString() {
        return text;
    }
}
