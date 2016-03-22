import java.util.HashMap;

public class PlateDatabase {
    private HashMap<String, String> licencePlates;

    public PlateDatabase() {
        licencePlates = new HashMap<String, String>();
    }

    public String lookup(String plateNumber) {
        if (licencePlates.containsKey(plateNumber))
            return licencePlates.get(plateNumber);
        return "NOT_FOUND";
    }

    public int register(String plateNumber, String owner) {
        if (licencePlates.containsKey(plateNumber))
            return -1;
        licencePlates.put(plateNumber, owner);
        return licencePlates.size();
    }

    public int size() {
        return licencePlates.size();
    }

}
