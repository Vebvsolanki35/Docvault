class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

        self.menu()

    
    def menu(self):
        print("1. Distance between two points")
        print("2. Distance of point from origin")
        print("3. Midpoint of two points")
        print("4. Slope of a line")
        print("5. point is on the line")
        print("6. Line intersect or parallel")
        print("7. Exit")
        choice = int(input("Enter your choice: "))



        if choice == 1:
            self.distance_between_two_points()
        elif choice == 2:
            self.distance_from_origin()
        elif choice == 3:
            self.midpoint_of_two_points()
        elif choice == 4:
            self.slope_of_a_line()
        elif choice == 5:
            self.point_is_on_the_line()
        elif choice == 6:
            self.line_intersect_or_parallel()
        elif choice == 7:
            exit()
        else:
            print("Invalid choice")

    
    def distance_between_two_points(self):
        x1 = int(input("Enter x1: "))
        y1 = int(input("Enter y1: "))
        x2 = int(input("Enter x2: "))
        y2 = int(input("Enter y2: "))
        distance = ((x2 - x1)**2 + (y2 - y1)**2)**0.5
        print(f"Distance between two points: {distance}")

        self.menu()

    def distance_from_origin(self):
        x = int(input("Enter x: "))
        y = int(input("Enter y: "))
        distance = (x**2 + y**2)**0.5
        print(f"Distance from origin: {distance}")

        self.menu()

    def midpoint_of_two_points(self):
        x1 = int(input("Enter x1: "))
        y1 = int(input("Enter y1: "))
        x2 = int(input("Enter x2: "))
        y2 = int(input("Enter y2: "))
        midpoint_x = (x1 + x2) / 2
        midpoint_y = (y1 + y2) / 2
        print(f"Midpoint of two points: {midpoint_x}, {midpoint_y}")

        self.menu()

    def slope_of_a_line(self):
        x1 = int(input("Enter x1: "))
        y1 = int(input("Enter y1: "))
        x2 = int(input("Enter x2: "))
        y2 = int(input("Enter y2: "))
        slope = (y2 - y1) / (x2 - x1)
        print(f"Slope of a line: {slope}")

        self.menu()

    def point_is_on_the_line(self):
        print("<x,y> is on the line ax + by + c = 0")
        x = int(input("Enter x: "))
        y = int(input("Enter y: "))

        a = int(input("Enter a: "))
        b = int(input("Enter b: "))
        c = int(input("Enter c: ")) 
        if a*x + b*y + c == 0:
            print("Point is on the line")
        else:
            distance = (a*x + b*y + c) / ((a**2 + b**2)**0.5)
            print(f"Distance from the line: {distance}")

        self.menu()

    def line_intersect_or_parallel(self):
        print("Line 1: ax + by + c = 0")
        print("Line 2: dx + ey + f = 0")
        a = int(input("Enter a: "))
        b = int(input("Enter b: "))
        c = int(input("Enter c: "))
        d = int(input("Enter d: "))
        e = int(input("Enter e: "))
        f = int(input("Enter f: "))
        if a*e == b*d:
            print("Lines are parallel")
        else:
            print("Lines are intersecting") 

        self.menu()

    def exit(self):
        print("Exiting...")
        self.menu()

p = Point(0,0)