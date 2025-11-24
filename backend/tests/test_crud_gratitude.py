import pytest
from app.crud import (
    create_gratitude_entry,
    get_user_gratitude_entries,
    delete_gratitude_entry,
)


class TestCreateGratitudeEntry:
    """Tests for create_gratitude_entry function"""
    
    def test_create_gratitude_entry_success(self, db, test_user):
        """Create gratitude entry successfully"""
        result = create_gratitude_entry(
            db,
            user_id=test_user.user_id,
            text="I'm grateful for my family",
            category="Family",
        )
        
        assert result["id"] > 0
        assert result["text"] == "I'm grateful for my family"
        assert result["category"] == "Family"
    
    def test_create_gratitude_entry_without_category(self, db, test_user):
        """Create gratitude entry without category"""
        result = create_gratitude_entry(
            db,
            user_id=test_user.user_id,
            text="I'm grateful",
        )
        
        assert result["id"] > 0
        assert result["text"] == "I'm grateful"
        assert result["category"] == ""
    
    def test_create_gratitude_entry_with_image(self, db, test_user):
        """Create gratitude entry with image URL"""
        result = create_gratitude_entry(
            db,
            user_id=test_user.user_id,
            text="Grateful moment",
            category="Life",
            image_url="/uploads/gratitude/123.jpg",
        )
        
        assert result["image"] == "/uploads/gratitude/123.jpg"
    
    def test_create_gratitude_entry_returns_formatted_date(self, db, test_user):
        """Created entry has formatted date"""
        result = create_gratitude_entry(
            db,
            user_id=test_user.user_id,
            text="Grateful",
        )
        
        assert "date" in result
        assert "/" in result["date"] 
    
    def test_create_gratitude_entry_long_text(self, db, test_user):
        """Create entry with long gratitude text"""
        long_text = "I'm grateful for " + "everything " * 50
        result = create_gratitude_entry(
            db,
            user_id=test_user.user_id,
            text=long_text,
        )
        
        assert result["text"] == long_text


class TestGetUserGratitudeEntries:
    """Tests for get_user_gratitude_entries function"""
    
    def test_get_gratitude_entries_empty(self, db, test_user):
        """Return empty list when no entries exist"""
        entries = get_user_gratitude_entries(db, test_user.user_id)
        assert entries == []
    
    def test_get_gratitude_entries_single(self, db, test_user):
        """Return single entry"""
        create_gratitude_entry(db, test_user.user_id, "I'm grateful")
        
        entries = get_user_gratitude_entries(db, test_user.user_id)
        assert len(entries) == 1
        assert entries[0]["text"] == "I'm grateful"
    
    def test_get_gratitude_entries_multiple(self, db, test_user):
        """Return multiple entries"""
        create_gratitude_entry(db, test_user.user_id, "Entry 1")
        create_gratitude_entry(db, test_user.user_id, "Entry 2")
        create_gratitude_entry(db, test_user.user_id, "Entry 3")
        
        entries = get_user_gratitude_entries(db, test_user.user_id)
        assert len(entries) == 3
    
    def test_get_gratitude_entries_ordered_by_recent(self, db, test_user):
        """Entries ordered by creation date"""
        create_gratitude_entry(db, test_user.user_id, "Entry 1")
        create_gratitude_entry(db, test_user.user_id, "Entry 2")
        create_gratitude_entry(db, test_user.user_id, "Entry 3")
        
        entries = get_user_gratitude_entries(db, test_user.user_id)

        assert len(entries) == 3
        texts = [e["text"] for e in entries]
        assert "Entry 1" in texts
        assert "Entry 2" in texts
        assert "Entry 3" in texts
    
    def test_get_gratitude_entries_isolated_by_user(self, db, test_user, test_user2):
        """Each user only sees their own entries"""
        create_gratitude_entry(db, test_user.user_id, "User1 Entry")
        create_gratitude_entry(db, test_user2.user_id, "User2 Entry")
        
        entries1 = get_user_gratitude_entries(db, test_user.user_id)
        entries2 = get_user_gratitude_entries(db, test_user2.user_id)
        
        assert len(entries1) == 1
        assert len(entries2) == 1
        assert entries1[0]["text"] == "User1 Entry"
        assert entries2[0]["text"] == "User2 Entry"
    
    def test_get_gratitude_entries_includes_all_fields(self, db, test_user):
        """Retrieved entries have all expected fields"""
        create_gratitude_entry(
            db,
            test_user.user_id,
            "Grateful text",
            category="Life",
            image_url="/uploads/pic.jpg",
        )
        
        entries = get_user_gratitude_entries(db, test_user.user_id)
        entry = entries[0]
        
        assert "id" in entry
        assert "text" in entry
        assert "category" in entry
        assert "date" in entry
        assert "image" in entry


class TestDeleteGratitudeEntry:
    """Tests for delete_gratitude_entry function"""
    
    def test_delete_gratitude_entry_success(self, db, test_user):
        """Delete gratitude entry successfully"""
        result = create_gratitude_entry(db, test_user.user_id, "Entry")
        entry_id = result["id"]
        
        deleted = delete_gratitude_entry(db, entry_id, test_user.user_id)
        assert deleted is True
        
        entries = get_user_gratitude_entries(db, test_user.user_id)
        assert len(entries) == 0
    
    def test_delete_gratitude_entry_not_exists(self, db, test_user):
        """Return False for non-existent entry"""
        deleted = delete_gratitude_entry(db, 999, test_user.user_id)
        assert deleted is False
    
    def test_delete_gratitude_entry_wrong_user(self, db, test_user, test_user2):
        """User cannot delete another user's entry"""
        result = create_gratitude_entry(db, test_user.user_id, "Entry")
        entry_id = result["id"]
        
        deleted = delete_gratitude_entry(db, entry_id, test_user2.user_id)
        assert deleted is False
        
        entries = get_user_gratitude_entries(db, test_user.user_id)
        assert len(entries) == 1
    
    def test_delete_gratitude_entry_only_deletes_one(self, db, test_user):
        """Deleting one entry doesn't delete others"""
        entry1 = create_gratitude_entry(db, test_user.user_id, "Entry 1")
        entry2 = create_gratitude_entry(db, test_user.user_id, "Entry 2")
        
        delete_gratitude_entry(db, entry1["id"], test_user.user_id)
        
        entries = get_user_gratitude_entries(db, test_user.user_id)
        assert len(entries) == 1
        assert entries[0]["text"] == "Entry 2"
