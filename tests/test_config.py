import unittest
from src.config import mask_token

class TestConfig(unittest.TestCase):
    def test_mask_token_long(self):
        self.assertEqual(mask_token("12345678"), "****5678")
    
    def test_mask_token_short(self):
        self.assertEqual(mask_token("123"), "****")
    
    def test_mask_token_empty(self):
        self.assertEqual(mask_token(""), "****")

if __name__ == '__main__':
    unittest.main()
