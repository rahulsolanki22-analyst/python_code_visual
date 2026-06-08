from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class VisualizeRequest(BaseModel):
    code: str
    max_steps: Optional[int] = 1000
    timeout: Optional[float] = 2.0
    target_step: Optional[int] = None
    mutated_variables: Optional[Dict[str, Any]] = None

class SuggestionItem(BaseModel):
    type: str
    text: str
    line: Optional[int] = None

class AnalysisResponse(BaseModel):
    time_complexity: str
    space_complexity: str
    warnings: List[str]
    suggestions: List[SuggestionItem]
    metrics: Dict[str, Any]

class VisualizeResponse(BaseModel):
    success: bool
    trace: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    analysis: Optional[AnalysisResponse] = None
