import types
from typing import Dict, Any

class TraceSerializer:
    def __init__(self):
        # Heap to store collections and custom objects, mapping obj_id string to content
        self.heap: Dict[str, Dict[str, Any]] = {}
        # Mapping from Python id(obj) to the serialized reference dictionary
        self.seen: Dict[int, Dict[str, Any]] = {}

    def serialize(self, obj: Any) -> Any:
        # Avoid serialization of functions, modules, and classes themselves
        if (
            isinstance(obj, (type, types.ModuleType, types.FunctionType, types.BuiltinFunctionType, types.BuiltinMethodType, types.MethodType))
            or hasattr(obj, '__module__')
            and obj.__module__ in ('sys', 'builtins', 'fastapi', 'pydantic', 'uvicorn')
        ):
            return f"<class/function {getattr(obj, '__name__', str(obj))}>"

        # Primitive Types are serialized in-place
        if isinstance(obj, (int, float, str, bool)) or obj is None:
            return obj

        obj_id = id(obj)
        obj_id_str = str(obj_id)

        # Check if we have already encountered this object to prevent infinite recursion
        if obj_id in self.seen:
            return self.seen[obj_id]

        # Register reference in 'seen' immediately to handle cyclic structures
        ref = {"type": "ref", "id": obj_id_str}
        self.seen[obj_id] = ref

        # List Serialization
        if isinstance(obj, list):
            # Resolve elements first, then add list structure to heap
            serialized_list = []
            for item in obj:
                serialized_list.append(self.serialize(item))
            
            self.heap[obj_id_str] = {
                "type": "list",
                "value": serialized_list
            }
            return ref

        # Deque/Queue Serialization
        if obj.__class__.__name__ == 'deque':
            serialized_list = []
            for item in obj:
                serialized_list.append(self.serialize(item))
            
            self.heap[obj_id_str] = {
                "type": "list",
                "value": serialized_list
            }
            return ref

        # Tuple Serialization
        if isinstance(obj, tuple):
            serialized_list = []
            for item in obj:
                serialized_list.append(self.serialize(item))
            
            self.heap[obj_id_str] = {
                "type": "tuple",
                "value": serialized_list
            }
            return ref

        # Set Serialization
        if isinstance(obj, set):
            serialized_list = []
            for item in obj:
                serialized_list.append(self.serialize(item))
            
            self.heap[obj_id_str] = {
                "type": "set",
                "value": serialized_list
            }
            return ref

        # Dictionary Serialization
        if isinstance(obj, dict):
            serialized_dict = {}
            for k, v in obj.items():
                serialized_dict[str(k)] = self.serialize(v)
            
            self.heap[obj_id_str] = {
                "type": "dict",
                "value": serialized_dict
            }
            return ref

        # Custom user-defined objects (e.g. TreeNode, ListNode, GraphNode)
        if hasattr(obj, '__dict__'):
            fields = {}
            for k, v in obj.__dict__.items():
                # Skip private attributes/dunder attributes to keep clean
                if k.startswith('__'):
                    continue
                fields[k] = self.serialize(v)
            
            self.heap[obj_id_str] = {
                "type": "object",
                "class": obj.__class__.__name__,
                "value": fields
            }
            return ref

        # Fallback string representation
        return str(obj)
