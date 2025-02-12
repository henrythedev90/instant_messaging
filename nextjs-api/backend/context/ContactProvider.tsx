import { createContext, useContext, useState } from "react";
import { Contact } from "../types/types"; // Make sure this is the correct path

// Define the context type
interface ContactsContextType {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

// Create the context
const ContactsContext = createContext<ContactsContextType | undefined>(
  undefined
);

// Create the provider component
export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  return (
    <ContactsContext.Provider value={{ contacts, setContacts }}>
      {children}
    </ContactsContext.Provider>
  );
}

// Custom hook to use contacts context
export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error("useContacts must be used within a ContactsProvider");
  }
  return context;
};
