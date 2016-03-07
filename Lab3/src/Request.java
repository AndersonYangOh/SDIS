import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Request {
    public static String type = "INVALID";
    public static String plateNumber = "INVALID";
    public static String owner = "INVALID";

    public Request(String request) {
        String[] tokens = request.split(" ");

        if (tokens[0].equals("REGISTER")) {
            type = "REGISTER";
            if (checkPlate(tokens[1]))
                plateNumber = tokens[1];
            else throw new IllegalArgumentException(tokens[1]);
            owner = tokens[2];
        } else if (tokens[0].equals("LOOKUP")) {
            type = "LOOKUP";
            if (checkPlate(tokens[1]))
                plateNumber = tokens[1];
            else throw new IllegalArgumentException(tokens[1]);
        } else {
            throw new IllegalArgumentException(tokens[0]);
        }
    }

    public Request(String type, String plateNumber, String owner) {
        this.type = type;
        this.plateNumber = plateNumber;
        if (owner.length() != 0) this.owner = owner;
    }

    public String toString() {
        switch (type) {
            case "REGISTER":
                return type + " " + plateNumber + " " + owner;
            case "LOOKUP":
                return type + " " + plateNumber;
            default:
                return "";
        }
    }

    private boolean checkPlate(String str) {
        Pattern p = Pattern.compile("[0-9A-Z]{2}-[0-9A-Z]{2}-[0-9A-Z]{2}");
        Matcher m = p.matcher(str);
        return m.find();
    }
}
