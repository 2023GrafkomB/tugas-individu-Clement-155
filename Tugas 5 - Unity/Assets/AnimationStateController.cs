using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class AnimationStateController : MonoBehaviour
{

    Animator animator;

    // Start is called before the first frame update
    void Start()
    {
    
        animator = GetComponent<Animator>();

    }

    // Update is called once per frame
    void Update()
    {
        bool isWalk = Input.GetKey("w");
        bool isRun = Input.GetKey(KeyCode.LeftShift);
        if (isWalk)
        {
            animator.SetBool("isWalk", true);
        }
        if(!isWalk) 
        {
            animator.SetBool("isWalk", false);
        }
        if (isRun && isWalk)
        {
            animator.SetBool("isRun", true);
        }
        if (!isRun || !isWalk)
        {
            animator.SetBool("isRun", false);
        }
    }
}
